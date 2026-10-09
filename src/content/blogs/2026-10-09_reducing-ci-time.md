---
title: 'Reducing CI time from ~15 minutes to under 6'
description: 'How splitting, sharding and caching our GitHub Actions jobs cut CI time by 62% without rewriting any tests'
pubDate: '2026-10-09'
---

## Summary (TL:DR)

|  | Before (avg of 10\) | After | Change |
| :---- | :---- | :---- | :---- |
| Test execution | 651s | 203s | **\-69%** |
| All CI workflows | \~897s (\~15m) | 340s (5m40s) | **\-62%** |

I didn't rewrite any tests and instead changed how the existing test files were scheduled with other jobs like lint check, tsc check etc.

Instead of rewriting the tests, I updated our CI jobs and made them pick tests in batches with a last job combining the result of the tests and verifying the coverage. These jobs also shared a single cache for `yarn install` to reduce the time taken during dependencies installation giving the results as you see above.

## Existing Pipeline

There was one GitHub action doing the following on a front-end repository:

checkout → setup-node → install (\~55s) → lint (\~30s) → format (\~28s) → tests \+ coverage (\~651s)

Across the last 10 successful runs, the action averaged **807s (13m27s)**, and the test step took most of the time. I also introduced `tsc –noEmit` step to check for any issues there which were not being caught before. This was required as agents were pushing more and more code and you do not want all the slop to be checked in. That took the run from 807s \-\> 897s (benchmarked across runs).

This was an issue as a single merge would block other dev and they will wait 15mins watching the CI to just complete. If you are working in an early state startup, and pushing code to production every day, this adds up\!

### Finding out why tests were slow

Vitest’s summary line on the CI shows the split between different phases of the test. The phases are as follow:

Duration 720.78s (transform 13.83s, setup 307.21s, import 40.60s, tests 199.93s, environment 95.96s)

- **`setup` 307s:** the global setup file imports `@utils/test-utils`. That module pulls in the whole Redux store (every RTK Query API slice), the MUI theme and the mock fixtures. Vitest isolates each test file, so this happens **245 times**.  
- **`environment` 96s:** a fresh jsdom for every file.  
- **`tests` 200s:** the actual assertions. This is around 1/4 of the time taken by the pipeline.

So most of the cost was per-file fixed overhead. Optimizing any tests here will not give any meaningful improvements and might have saved few seconds to a minute which is not the improvement I was looking for anyway.

## Fixing the pipeline

To fix the above issue, I updated the pipeline by splitting the single CI action into separate jobs:

- Lint  
- Type check  
- Format  
- Tests

Since these jobs can run in parallel, this solves the biggest issue that one job is not waiting on the previous one to complete. But if you see here the test job will still take 10mins and is the biggest job in our pipeline. The improvement is already good at 35% but we can extract more out of the GitHub actions.

#### Sharding the test suite

```yaml
test:
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    # checkout, setup-node, install …
    - run: >-
        yarn vitest run --coverage --shard=${{ matrix.shard }}/4 --reporter=blob
        --coverage.thresholds.lines=0 --coverage.thresholds.functions=0
        --coverage.thresholds.branches=0 --coverage.thresholds.statements=0
    - uses: actions/upload-artifact@v4
      with:
        name: blob-report-${{ matrix.shard }}
        path: .vitest-reports/*
        include-hidden-files: true
        retention-days: 1
```

Sharding here is basically taking the single test job and splitting it into 4 test jobs, each job picking up a subset of the tests and running those in parallel. This increases the jobs in the action from 4 to 8\. The cost is also increased with this and we are okay with that and that is not a concern for us.

After sharding the test times were: 112s, 174s, 184s and 189s. `fail-fast: false` keeps one failing shard from cancelling the others, so you see every failure in one run and devs can fix the failing tests in the next pass without having to go in loop waiting for all to run one by one. Saving a bit of dev time :)

Each of the test job checks the coverage of the tests it runs against the files and uploads those under `.vitest-reports` such that after all checks, we can verify the actual coverage of the code.

#### Merging the coverage of tests in another job

```yaml
coverage:
  needs: test
  if: ${{ !cancelled() }}
  steps:
    # checkout, setup-node, install …
    - uses: actions/download-artifact@v4
      with:
        path: .vitest-reports
        pattern: blob-report-*
        merge-multiple: true
    - run: yarn vitest run --merge-reports --coverage
```

Once the tests pass, based on the coverage defined in the vitest config, the merge job will pick those artefacts uploaded by the test jobs and combine them to calculate the final coverage of the tests.

#### Caching dependencies

Adding `cache: yarn` to `actions/setup-node`, plus `--frozen-lockfile` is a must when there are 4 jobs instead of one as each install takes around 55 seconds. And you do not want each job to increase the time just by waiting for it to install the dependencies. This way, the first job takes 55 seconds to install deps and later jobs pull the saved cache and use it to check the time taken by tests, reducing time to around 25 seconds on later jobs.

## Gotchas worth knowing about

1. **Coverage thresholds fail every shard.** Each shard only exercises part of the codebase. The fix is to set the thresholds to `0` on the shard runs and enforce them only in `--merge-reports`.  
2. **`upload-artifact@v4` skips hidden files by default.** The blob reports live in `.vitest-reports/`, so you need `include-hidden-files: true` or the merge job finds nothing.  
3. **Don't run two shards locally in one checkout.** They share `coverage/.tmp-*`, and one wipes the other ("Something removed the coverage directory…"). On CI runners each shard has its own machine, so this never happens there.  
4. **Single runs lie.** The old test step ranged from 414s to 805s across 10 runs of the same suite. Compare averages, not one run against one run to get the actual baseline and improvement.

## What's left, and future ideas

- **Per-file setup is still the biggest cost.** About 307s across workers goes to importing the store graph for every test file. Making `test-utils` lazy, or splitting a lightweight setup for pure-logic tests, would help every shard.  
- **`isolate: false`** would remove most of that setup time, but our Redux store is a module-level singleton, so state would leak between files. It needs a store-reset pass first.  
- **happy-dom instead of jsdom** could cut part of the 96s environment cost, with some risk of MUI and testing-library compatibility issues.  
- **Balance the shards.** Vitest shards by file count, not duration, so they ran 112s to 189s. Better balancing would bring the slowest shard toward the \~165s average.  
- **The `checks` job (4m39s) is now the critical path,** mostly `tsc` (142s) and the cold install. Caching `tsc --incremental` build info between runs is the next lever.