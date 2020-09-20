import * as pull from 'pull-stream'

const noop = function () {
  /* */
}

export interface Options {
  forbidExtraRequests: boolean
  enforceStreamTermination: boolean
  notifyEagerly: boolean
}

function checkArgs(opts: Options) {
  // tslint:disable-next-line strict-type-predicates
  if (typeof opts.forbidExtraRequests !== 'boolean') {
    throw new Error("Invalid argument 'forbidExtraRequests': should be a boolean value")
  }

  // tslint:disable-next-line strict-type-predicates
  if (typeof opts.enforceStreamTermination !== 'boolean') {
    throw new Error("Invalid argument 'enforceStreamTermination': should be a boolean value")
  }

  // tslint:disable-next-line strict-type-predicates
  if (typeof opts.notifyEagerly !== 'boolean') {
    throw new Error("Invalid argument 'notifyEagerly': should be a boolean value")
  }
}

export default function <T>(opts: Partial<Options> = {}) {
  opts.forbidExtraRequests = opts.forbidExtraRequests ?? false
  opts.enforceStreamTermination = opts.enforceStreamTermination ?? false
  opts.notifyEagerly = opts.notifyEagerly ?? true

  checkArgs(opts as Options)

  function notify(message: string) {
    if (opts.notifyEagerly) {
      throw new Error(message)
    } else {
      errors.push(new Error(message))
    }
  }

  const errors: Error[] = []
  let aborted: pull.Abort = false
  let done: pull.EndOrError = false
  let j = 1
  let latest = 0
  let skipped: Record<number, boolean> = {}

  function input(requests: pull.Source<T>): pull.Source<T> {
    return function output(_abort, x) {
      if (aborted || done) {
        if (_abort === false) {
          notify('Invariant 1 violated: value requested after termination')
        }
        if (opts.forbidExtraRequests) {
          if (aborted) {
            notify('Invariant 6 violated: request made after the stream was aborted')
          }
          if (done) {
            notify('Invariant 6 violated: request made after the stream has terminated')
          }
        }
      }
      aborted = aborted || _abort

      let i = j++
      if (!x) {
        skipped[i] = true
        requests(aborted, noop)
      } else {
        let xi = 0
        requests(_abort, function (_done, v) {
          if (!_done && (aborted || done)) {
            notify('Invariant 5 violated: callback ' + i + ' returned a value after termination')
          }

          xi++
          if (xi > 1) {
            notify('Invariant 3 violated: callback ' + i + ' invoked ' + xi + ' times')
          }
          if (i < latest) {
            notify('Invariant 4 violated: callback ' + i + ' invoked after callback ' + latest)
          } else if (i > latest + 1) {
            notify(
              'Invariant 4 violated: callback ' + i + ' invoked before callback ' + (latest + 1)
            )
          } else {
            latest = i
          }

          done = done || _done
          x(done, v)
        })
      }
    }
  }

  input.terminate = function () {
    if (j > latest + 1) {
      for (let k = latest + 1; k < j; k++) {
        if (!skipped[k]) {
          notify('Invariant 2 violated: callback ' + k + ' was never invoked')
        }
      }
    }

    if (opts.enforceStreamTermination && !done && !aborted) {
      notify('Invariant 7 violated: stream was never terminated')
    }

    return errors
  }

  return input
}
