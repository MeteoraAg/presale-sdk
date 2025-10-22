# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## presale [0.0.6] [PR #9](https://github.com/MeteoraAg/presale-sdk/pull/9)

### Added

- `disableWithdraw` option on fixed price presale mode. Allow creator to disable withdrawing from the vault after deposit.
- `disableEarlierPresaleEndOnceCapReached` option. Allow creator to prevent the presale end immediately once the target cap reached on FCFS and fixed price presale.
- `immediateReleaseTimestamp`. Allow creator to configure the timing of immediate release portion of token.
- `calculateLockAndVestDurationFromTimestamps` helper function to calculate lock and vest duration from presale end time, lock end time, and vest end time.

## presale [0.0.5] [PR #10](https://github.com/MeteoraAg/presale-sdk/pull/10)

- Fix on qPrice conversion failed on edge prices due to scientific notation

## presale [0.0.4] [PR #8](https://github.com/MeteoraAg/presale-sdk/pull/8)

### Fixed

- Presale progress end timing

### Added

- Allow integrator to disable compute unit instruction prepend by using `setComputeUnitOptimization`

## presale [0.0.3] [PR #6](https://github.com/MeteoraAg/presale-sdk/pull/7)

### Fixed

- `uiPriceToQPrice` conversion
- Minor bug fixes: avoiding zero division, null registryIndex

## presale [0.0.2] [PR #6](https://github.com/MeteoraAg/presale-sdk/pull/6)

### Fixed

- Export `Presale` class
