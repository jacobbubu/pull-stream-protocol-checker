# @jacobbubu/pull-stream-protocol-checker

[![Build Status](https://github.com/jacobbubu/pull-stream-protocol-checker/workflows/Build%20and%20Release/badge.svg)](https://github.com/jacobbubu/pull-stream-protocol-checker/actions?query=workflow%3A%22Build+and+Release%22)
[![Coverage Status](https://coveralls.io/repos/github/jacobbubu/pull-stream-protocol-checker/badge.svg)](https://coveralls.io/github/jacobbubu/pull-stream-protocol-checker)
[![npm](https://img.shields.io/npm/v/@jacobbubu/pull-stream-protocol-checker.svg)](https://www.npmjs.com/package/@jacobbubu/pull-stream-protocol-checker/)

> Rewriting [pull-stream-protocol-checker](https://github.com/elavoie/pull-stream-protocol-checker) with TypeScript

# pull-stream-protocol-checker

## Why rewrite?

* For other TypeScript projects to have a type-friendly checking library.
* Easy for my colleagues to port to other strongly typed programming languages

## Original readme

Pull-stream module for detecting protocol violations at the interface of two modules.

Report an error if one of the following invariants is violated:

1. No ask request (`read(false, ...)`) after termination
2. Every callback is eventually invoked
3. Every callback is invoked only once
4. The callbacks are invoked in the order in which they were created
5. No value answer (`cb(false, data)`) after termination

Optionally can check:

6. That no other request are made after the stream has terminated or was aborted
7. The stream is eventually terminated

## Usage

``` ts
import * as pull from 'pull-stream'
import checker from '@jacobbubu/pull-stream-protocol-checker'

const probe = checker({
  forbidExtraRequests: true,
  enforceStreamTermination: true,
})

pull(
  pull.count(10),
  probe,
  pull.drain(null, function () {
    probe.terminate()
  })
)
```

## options

``` ts
const probe = checker({forbidExtraRequests: true, enforceStreamTermination:true, notifyEagerly: true})
```

* `forbidExtraRequests`      `<Boolean>` (Defaults to `false`)
* `enforceStreamTermination` `<Boolean>` (Defaults to `false`)
* `notifyEagerly`            `<Boolean>` (Defaults to `true`)

Invariant 6 is activated by setting `forbidExtraRequests` to `true`. Invariant 7 is activated by setting `enforceStreamTermination` to `true`. If `notifyEagerly===true`, an invariant violation is reported as an error that is thrown immediately; otherwise all violations are remembered and returned as an error array when invoking `errors = probe.terminate()`.

## Other modules with similar goals

https://github.com/dominictarr/pull-spec

https://github.com/nichoth/pull-stream-spec
