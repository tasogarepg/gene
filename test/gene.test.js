var assert = require('assert');
var fs = require('fs');
var path = require('path');
var gene = require('../');

var fileA = path.join(__dirname, 'fixtures', '_a.txt'); // aaaa
var fileB = path.join(__dirname, 'fixtures', '_b.txt'); // bbbb

describe('Gene', function() {

  it('sync', function(done) {
    gene(function*(g) {
      g.data.d1 = 'a';
      yield 0;
      g.data.d1 += 'b';
      yield 0;
      assert.equal(g.data.d1, 'ab');
    })(done);
  });

  it('serial async', function(done) {
    gene(function*(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      yield 0;
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
      var str = g.data.d1 + g.data.d2;
      assert.equal(str, 'aaaabbbb');
    })(done);
  });

  it('parallel async', function(done) {
    gene(function*(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
      fs.readFile(fileA, 'utf8', g.cb('d3'));
      fs.readFile(fileB, 'utf8', g.cb('d4'));
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 + g.data.d4;
      assert.equal(str, 'aaaabbbbaaaabbbb');
    })(done);
  });

  it('sync cb', function(done) {
    gene(function*(g) {
      g.cb('d1')(null, 'a');
      g.cb('d2')(null, 'b');
      yield 0;
      g.cb('d3')(null, 'c');
      g.cb('d4')(null, 'd');
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 + g.data.d4;
      assert.equal(str, 'abcd');
    })(done);
  });

  it('parallel async and sync cb', function(done) {
    gene(function*(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      g.cb('d3')(null, 'c');
      g.cb('d4')(null, 'd');
      yield 0;
      g.cb('d5')(null, 'e');
      g.cb('d6')(null, 'f');
      fs.readFile(fileA, 'utf8', g.cb('d7'));
      fs.readFile(fileB, 'utf8', g.cb('d8'));
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 + g.data.d4 +
        g.data.d5 + g.data.d6 + g.data.d7 + g.data.d8;
      assert.equal(str, 'aaaabbbbcdefaaaabbbb');
    })(done);
  });

  it('parallel async setTimeout', function(done) {
    gene(function*(g) {
      var str = '';
      var cb1 = g.cb();
      setTimeout(function() {
        str += 'a';
        cb1();
      }, 40);
      var cb2 = g.cb();
      setTimeout(function() {
        str += 'b';
        cb2();
      }, 20);
      var cb3 = g.cb();
      setTimeout(function() {
        str += 'c';
        cb3();
      }, 1);
      yield 0;
      assert.equal(str, 'cba');
    })(done);
  });

  it('exception from sync cb', function(done) {
    gene(function*(g) {
      try {
        g.cb('d1')(new Error('error1'), 'a');
        g.cb('d2')(new Error('error2'), 'b');
        yield 0;
        assert(false);
      } catch(e) {
        if (!/error1/.test(e.message)) throw e;
        var str = g.data.d1 + g.data.d2;
        assert.equal(str, 'ab');
      }
      yield 0;
    })(done);
  });

  it('exception from async cb', function(done) {
    gene(function*(g) {
      try {
        fs.readFile(fileA, 'utf8', g.cb('d1'));
        fs.readFile('not_found1', 'utf8', g.cb('d2'));
        fs.readFile(fileB, 'utf8', g.cb('d3'));
        fs.readFile('not_found2', 'utf8', g.cb('d4'));
        yield 0;
        assert(false);
      } catch(e) {
        if (!/not_found/.test(e.message)) throw e;
        var str = g.data.d1 + g.data.d3;
        assert.equal(str, 'aaaabbbb');
      }
      yield 0;
    })(done);
  });

  it('exception from async and sync cb', function(done) {
    gene(function*(g) {
      try {
        fs.readFile('not_found1', 'utf8', g.cb('d1'));
        g.cb('d2')(new Error('error1'), 'x');
        yield 0;
        assert(false);
      } catch(e) {
        var str = g.data.d2;
        assert.equal(str, 'x');
      }
      yield 0;
    })(done);
  });

  it('exception from parallel async and sync cb', function(done) {
    gene(function*(g) {
      try {
        fs.readFile(fileA, 'utf8', g.cb('d1'));
        fs.readFile('not_found1', 'utf8', g.cb('d2'));
        fs.readFile(fileB, 'utf8', g.cb('d3'));
        fs.readFile('not_found2', 'utf8', g.cb('d4'));
        g.cb('d5')(new Error('error1'), 'x');
        g.cb('d6')(new Error('error2'), 'y');
        yield 0;
        assert(false);
      } catch(e) {
        var str = g.data.d1 + g.data.d3 + g.data.d5 + g.data.d6;
        assert.equal(str, 'aaaabbbbxy');
      }
      yield 0;
    })(done);
  });

  it('exception from nested block', function(done) {
    gene(function*(g) {
      var run = '';
      try {
        gene(function*(g) {
          run += '1';
          fs.readFile('not_found1', 'utf8', g.cb('e1'));
          yield 0;
        })(g.cb('d1'));
        yield 0;
        assert(false);
      } catch(e) {
        run += '2';
        if (!/not_found/.test(e.message)) throw e;
      }
      yield 0;
      assert.equal(run, '12');
    })(done);
  });

  it('throw exception from sync to callback', function(done) {
    gene(function*(g) {
      g.cb('d1')(new Error('error1'), 'a');
      yield 0;
      assert(false);
    })(function(err, data) {
      assert.notEqual(err, null);
      assert.equal(data.d1, 'a');
      done((err.message == 'error1') ? null : err);
    });
  });

  it('throw exception from async to callback', function(done) {
    gene(function*(g) {
      fs.readFile('not_found1', 'utf8', g.cb('d1'));
      yield 0;
      assert(false);
    })(function(err) {
      assert.notEqual(err, null);
      done(/not_found/.test(err.message) ? null : err);
    });
  });

  it('two try block', function(done) {
    gene(function*(g) {
      var run = '';
      try {
        run += '1';
        fs.readFile('not_found1', 'utf8', g.cb('d1'));
        yield 0;
        assert(false);
      } catch(e) {
        run += '2';
        if (!/not_found1/.test(e.message)) throw e;
      }
      yield 0;
      try {
        run += '3';
        fs.readFile('not_found2', 'utf8', g.cb('d2'));
        yield 0;
        assert(false);
      } catch(e) {
        run += '4';
        if (!/not_found2/.test(e.message)) throw e;
      }
      yield 0;
      assert.equal(run, '1234');
    })(done);
  });

  it('nested try block', function(done) {
    gene(function*(g) {
      var run = '';
      try {
        try {
          run += '1';
          fs.readFile('not_found1', 'utf8', g.cb('d1'));
          yield 0;
          assert(false);
        } catch(e) {
          run += '2';
        }
        run += '3';
        fs.readFile('not_found2', 'utf8', g.cb('d2'));
        yield 0;
        assert(false);
      } catch(e) {
        run += '4';
        if (!/not_found2/.test(e.message)) throw e;
      }
      yield 0;
      assert.equal(run, '1234');
    })(done);
  });

  it('nested try block throw', function(done) {
    gene(function*(g) {
      var run = '';
      try {
        try {
          run += '1';
          fs.readFile('not_found1', 'utf8', g.cb('d1'));
          yield 0;
          assert(false);
        } catch(e) {
          run += '2';
          throw e;
        }
      } catch(e) {
        run += '3';
        if (!/not_found1/.test(e.message)) throw e;
      }
      run += '4';
      yield 0;
      assert.equal(run, '1234');
    })(done);
  });

  it('jump to callback', function(done) {
    var run = '';
    gene(function*(g) {
      try {
        run += '1';
        fs.readFile(fileA, 'utf8', g.cb('d1'));
        yield 0;

        run += '2';
        if (true) return;

        run += '3';
        fs.readFile(fileB, 'utf8', g.cb('d2'));
        yield 0;
      } finally {
        run += '4';
      }
    })(function(err, data) {
      assert.equal(run, '124');
      assert.equal(data.d1, 'aaaa');
      done(err);
    });
  });

  it('delegate yield', function(done) {
    function* sub(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
    }
    gene(function*(g) {
      yield* sub(g);
      fs.readFile(fileA, 'utf8', g.cb('d3'));
      fs.readFile(fileB, 'utf8', g.cb('d4'));
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 + g.data.d4;
      assert.equal(str, 'aaaabbbbaaaabbbb');
    })(done);
  });

  it('delegate yield and throw exception', function(done) {
    function* sub(g) {
      fs.readFile('not_found1', 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
      assert(false);
    }
    gene(function*(g) {
      try {
        yield* sub(g);
        yield 0;
        assert(false);
      } catch(e) {
        if (!/not_found/.test(e.message)) throw e;
        var str = g.data.d2;
        assert.equal(str, 'bbbb');
      }
    })(done);
  });

  it('nested gene', function(done) {
    gene(function*(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
      fs.readFile(fileA, 'utf8', g.cb('d3'));
      gene(function*(g) {
        fs.readFile(fileB, 'utf8', g.cb('e1'));
        fs.readFile(fileA, 'utf8', g.cb('e2'));
        yield 0;
        fs.readFile(fileB, 'utf8', g.cb('e3'));
        yield 0;
      })(g.cb('d4'));
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 +
        g.data.d4.e1 + g.data.d4.e2 + g.data.d4.e3;
      assert.equal(str, 'aaaabbbbaaaabbbbaaaabbbb');
    })(done);
  });

  it('nested and parallel gene', function(done) {
    gene(function*(g) {
      fs.readFile(fileA, 'utf8', g.cb('d1'));
      fs.readFile(fileB, 'utf8', g.cb('d2'));
      yield 0;
      fs.readFile(fileA, 'utf8', g.cb('d3'));
      gene(function*(g) {
        fs.readFile(fileB, 'utf8', g.cb('e1'));
        fs.readFile(fileA, 'utf8', g.cb('e2'));
        yield 0;
        fs.readFile(fileB, 'utf8', g.cb('e3'));
        yield 0;
      })(g.cb('d4'));
      gene(function*(g) {
        fs.readFile(fileA, 'utf8', g.cb('e1'));
        fs.readFile(fileB, 'utf8', g.cb('e2'));
        yield 0;
        fs.readFile(fileA, 'utf8', g.cb('e3'));
        yield 0;
      })(g.cb('d5'));
      yield 0;
      var str = g.data.d1 + g.data.d2 + g.data.d3 +
        g.data.d4.e1 + g.data.d4.e2 + g.data.d4.e3 +
        g.data.d5.e1 + g.data.d5.e2 + g.data.d5.e3;
      assert.equal(str, 'aaaabbbbaaaabbbbaaaabbbbaaaabbbbaaaa');
    })(done);
  });

  it('bench', function(done) {
    var loopCount = 10000;
    (function serialLoop() {
      if (loopCount-- <= 0) return done();
      gene(function*(g) {
        setImmediate(g.cb());
        yield 0;
        setImmediate(g.cb());
        setImmediate(g.cb());
        yield 0;
        setImmediate(g.cb());
        setImmediate(g.cb());
        setImmediate(g.cb());
        yield 0;
        setImmediate(g.cb());
        setImmediate(g.cb());
        setImmediate(g.cb());
        setImmediate(g.cb());
        yield 0;
      })(serialLoop);
    })();
  });

});
