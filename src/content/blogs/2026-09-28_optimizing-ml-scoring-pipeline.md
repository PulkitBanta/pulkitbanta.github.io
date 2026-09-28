---
title: 'Optimizing ML scoring pipeline: Batch queries and workers in Go'
description: 'How I optimized the ML scoring pipeline by reducing the peak memory allocation and processing time'
pubDate: '2026-09-28'
---

### The problem

Last couple of weeks, I was working on optimization for the ML pipeline such that we can process data within minutes and give a prediction score for the accounts.

Some context: At FunnelStory, we train prediction models for every customer's accounts to see how they behaved and what metrics differ between the two, the models then give a score to each factor contributing to churn / retention of the account. Based on that a prediction model is trained. This model is then used to score accounts every day using a background job to keep your CSMs up to date on what is happening and if you should be careful about a customer.

This is usually a one time process once the data is fixed, to come at the final stage we need to iterate over the data, fix issues if any and test the different metrics for the prediction model. 

#### The data issue

The approach that we took to score the accounts was working fine when the scale was around 10-20k accounts to be scored. But soon the scale changed to 150k accounts and we knew that if it takes 15-20 minutes for 10k accounts then scoring 150k accounts would scale somewhat linearly. This was a huge problem as when initially training and checking what fits best, we need to iterate over the data to make a model that is unique for the data of the accounts being tracked.

With 150k accounts and 5 products per account, that is 750k records to be scored every day. This should not take a lot of server time to ensure that other work gets priority.

The number of data points doesn’t stop at 750k, if every account:product combination has 25 metrics to be tracked, it soon becomes a scale of 187.5M points to be processed and used for scoring the accounts.

### Benchmarking

To see how much time this would have taken with our existing process, I wrote a benchmark test using LLMs that lets me measure time taken for the same, products were kept at 5, metrics at 10 to keep it simple to estimate.

With 150k accounts, 5 products on a test workspace, this took \~75 minutes. And on local replicating the same and benchmarking took 15 minutes with heap size growing to \~15GB (it was crashing my docker containers 🙁). I had to optimize it such that if we have to iterate it doesn’t take more than 30 minutes to play around the metrics and it should not crash the K8 pods on production for our customers.

While benchmarking the code, a couple of issues that I saw were

- looping over all the points and then scoring for the account & product  
- all the points and scores for account, product live in memory  
- 1 write to db for each account \+ 1 for each product \~= 750k writes  
- The writes to DB amounted for \~40% of the time taken by the process

### The solution

#### Parallel processing

Instead of looping over millions of points in a loop to score the accounts, the better way was to loop over the points in a batch and every batch handled by a worker. The safe assumption for this was to give every worker 1k accounts and generate a score for the same. The work done by a worker is not affected by other workers as the accounts are being processed in isolation within the worker and don't interfere with each other.

The score for the account can be written immediately by the worker once it processes the points for that account, we filter out the points not used for the products and calculate product score, writing everything to the DB. Keeping a local memory for each worker to write the scores of all 1k accounts being processed is what enabled this and helped reducing memory usage, DB writes hence reducing the overall latency.

Few issues here were if the number of accounts were less, we are not optimizing anything as it will still process in a single loop. So the size of workers became `points / total workers` this meant that for a few accounts, we still processed the data in parallel.

```go
# Before: one loop over every point, all scores kept in memory
for point in 187.5M points:
    score(account, product, point)
    keep all scores in memory              # grows until the end

# Now: workers take batches of accounts, isolated from each other
batches = split(accounts, size = accounts / workers)
for batch in batches, in parallel:         # e.g. 1k accounts per worker
    for account in batch:
        score(account, product, points)
        write the batch's scores to DB
```

#### DB writes

Writing to DB \~1M times is not ideal and takes a lot of back and forth which is where the main bottleneck was. Now that we are processing accounts in batches to generate the score, the time it takes to process all the accounts is reduced by \~40% from 15 min to 8.5 min. I noticed that we can write to the DB for the accounts already processed within the worker and utilize the same to optimize for the DB writes by batching it up.

So I updated the code such that we now write to DB in batches of 1k accounts within a single DB query and reduce the requests from 150k for the accounts to 150\. Same is then applied for the products as every account’s product scores are being calculated together so the total queries were reduced from 750k to \~900 (there are some other queries to ensure data is correct) this alone was a huge win.

```go
# Before: one write per account + one per product
for account in 150k:
    db.write(account_score)                # 150k writes
    for product in 5:
        db.write(product_score)            # 750k writes
                                          # ~900k writes, ~40% of total time

# Now: rows batched at 1k, flushed by the worker
for batch of 1000 accounts in a worker:
    db.write(account_scores)               # 1000 rows -> 1 write
    for product in 5:
        db.write(product_scores[product])  # 1000 rows -> 1 write
                                          # ~6 writes per batch, ~900 total
```

#### Memory allocation

The memory problem was almost solved with the above approach as scores for 750k account:product were no longer in the memory as every worker will write to the DB after it processed the 1k accounts and GC will clear the memory once it is done.

There were few other problems as we were creating copies of the points and then modifying the same during our model training phase, this was again taking up more space as the number of points is really huge and every \~100 bytes addition adds up to a lot which will make the OOM really fast.

Saving space by not allocating the map for the points and instead changing it to be initialized only when required using `make` to save memory allocation. This avoids the bucket size increase at runtime which can take more time while re-allocating the space and can be larger than what the required size is [\[1\]](https://leapcell.medium.com/understanding-slice-and-map-expansion-in-go-9fd7482721a5).

Sample code:

```go
# Before: map allocated up front for every point
var points = map[string]any{}              # allocated even when unused

# Now: nothing allocated until we know it's needed
var points map[string]any                  # nil, 0 bytes
if metrics > 0:
    points = make(map, len(metrics))       # exact size, no runtime re-growth
```

All these small additions with the optimization of workers and DB batching, ensured that I was able to get the scoring of accounts under \~25 mins.

#### References

1. [https://leapcell.medium.com/understanding-slice-and-map-expansion-in-go-9fd7482721a5](https://leapcell.medium.com/understanding-slice-and-map-expansion-in-go-9fd7482721a5) 


