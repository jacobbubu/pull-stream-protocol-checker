import * as pull from 'pull-stream'
import checker from '../src'

const noop = function () {
  /* */
}

describe('basic test', () => {
  it('README Example', (done) => {
    const probe = checker({
      forbidExtraRequests: true,
      enforceStreamTermination: true,
    })

    pull(
      pull.count(10),
      probe,
      pull.drain(undefined, function () {
        probe.terminate()
        done()
      })
    )
  })

  it('invalid options', () => {
    expect(() => {
      checker({ forbidExtraRequests: 1 } as any)
    }).toThrow("Invalid argument 'forbidExtraRequests': should be a boolean value")

    expect(() => {
      checker({ enforceStreamTermination: 1 } as any)
    }).toThrow("Invalid argument 'enforceStreamTermination': should be a boolean value")

    expect(() => {
      checker({ notifyEagerly: 1 } as any)
    }).toThrow("Invalid argument 'notifyEagerly': should be a boolean value")
  })

  it('Invariant 1 violated: value requested after termination', () => {
    expect(() => {
      const probe = checker({ forbidExtraRequests: true, enforceStreamTermination: true })
      const source = pull(pull.count(10), probe)
      source(true, noop)
      source(false, noop)
    }).toThrow('Invariant 1 violated: value requested after termination')
  })

  it('Invariant 2 violated: callback 1 was never invoked', () => {
    expect(() => {
      const probe = checker({ forbidExtraRequests: true, enforceStreamTermination: true })
      const source = pull(function (abort, cb) {
        // do nothing with cb
      }, probe)

      source(false, noop)
      probe.terminate()
    }).toThrow('Invariant 2 violated: callback 1 was never invoked')
  })

  it('Invariant 3 violated: callback 1 invoked 2 times', () => {
    expect(() => {
      const probe = checker()
      let cb: pull.SourceCallback<number> | undefined
      const source = pull(function (abort, _cb) {
        cb = _cb
      }, probe)

      source(false, noop)
      cb!(false, 1)
      cb!(false, 1)
      probe.terminate()
    }).toThrow('Invariant 3 violated: callback 1 invoked 2 times')
  })

  it('Invariant 4 violated: callback 2 invoked before callback 1', () => {
    expect(() => {
      const probe = checker()
      const cbs: pull.SourceCallback<number>[] = []
      const source = pull(function (abort, _cb) {
        cbs.push(_cb)
      }, probe)

      source(false, noop)
      source(false, noop)
      cbs[1](false, 2)
      cbs[0](false, 1)
      probe.terminate()
    }).toThrow('Invariant 4 violated: callback 2 invoked before callback 1')
  })

  it('Invariant 5 violated: callback 2 returned a value after termination', () => {
    expect(() => {
      const probe = checker()
      let cb: pull.SourceCallback<number> | undefined
      const source = pull(function (abort, _cb) {
        cb = _cb
      }, probe)
      source(false, noop)
      cb!(true)
      source(true, noop)
      cb!(false, 1)
    }).toThrow('Invariant 5 violated: callback 2 returned a value after termination')
  })

  it('Invariant 6 violated: request made after the stream was aborted', () => {
    expect(() => {
      const probe = checker({ forbidExtraRequests: true })
      const source = pull(pull.count(0), probe)

      source(true, noop)
      source(true, noop)
    }).toThrow('Invariant 6 violated: request made after the stream was aborted')

    expect(() => {
      const probe = checker({ forbidExtraRequests: true })
      const source = pull(pull.count(1), probe)

      source(false, noop)
      source(false, noop)
      source(false, noop)
      source(true, noop)
    }).toThrow('Invariant 6 violated: request made after the stream has terminated')
  })

  it('Invariant 7 violated: stream was never terminated', () => {
    expect(() => {
      const probe = checker({ forbidExtraRequests: true, enforceStreamTermination: true })
      const source = pull(function (abort, _cb) {
        _cb(false, 1)
      }, probe)

      source(false, noop)
      source(false, noop)
      probe.terminate()
    }).toThrow('Invariant 7 violated: stream was never terminated')
  })

  it('Notify during termination', () => {
    const probe = checker({
      forbidExtraRequests: true,
      enforceStreamTermination: true,
      notifyEagerly: false,
    })

    const source = pull(function (abort, _cb) {
      _cb(false, 1)
    }, probe)

    let errors
    source(false, noop)
    source(false, noop)
    errors = probe.terminate()
    expect(errors.length).toBe(1)
    expect(errors[0].message).toBe('Invariant 7 violated: stream was never terminated')
  })
})
