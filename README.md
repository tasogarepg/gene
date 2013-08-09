# gene

A generator-based control-flow library for Node.js.  
Easily parallel execution and error handling.  

## Installation

    $ npm install gene

## Usage

If Node.js is v0.11.x, you must use the `--harmony-generators` flag.

    $ node --harmony-generators your-script.js

## Example

```js
var fs = require('fs');
var gene = require('gene');

gene(function*(g) {
  fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
  fs.readFile('/path/to/file2', 'utf8', g.cb('d2'));
  yield 0;    // <-- await!

  var str = g.data.d1 + g.data.d2;
  console.log(str);
})();
```

### Error handling

```js
var fs = require('fs');
var gene = require('gene');

gene(function*(g) {
  try {
    fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
    fs.readFile('/path/to/file2', 'utf8', g.cb('d2'));
    yield 0;

  } catch(e) {
    console.log(e);
  }
})();
```

### Callback

sample() is called at the end.

```js
var fs = require('fs');
var gene = require('gene');

gene(function*(g) {
  fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
  fs.readFile('/path/to/file2', 'utf8', g.cb('d2'));
  yield 0;
})(sample);

function sample(err, data){
  if (err) throw err;
  console.log(data.d1 + data.d2);
}
```

### Jump to callback

```js
var fs = require('fs');
var gene = require('gene');

gene(function*(g) {
  fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
  yield 0;

  if (true) return; // junp to callback

  // not run here.

})(function(err, data) {
  // always run
});
```

### Nesting

```js
var fs = require('fs');
var gene = require('gene');

gene(function*(g) {
  fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
  fs.readFile('/path/to/file2', 'utf8', g.cb('d2'));
  yield 0;
  fs.readFile('/path/to/file3', 'utf8', g.cb('d3'));
  yield 0;

  gene(function*(g) {
    fs.readFile('/path/to/file4', 'utf8', g.cb('e1'));
    fs.readFile('/path/to/file5', 'utf8', g.cb('e2'));
    yield 0;
    fs.readFile('/path/to/file6', 'utf8', g.cb('e3'));
    yield 0;
  })(g.cb('d4'));
  yield 0;

  var str = g.data.d1 + g.data.d2 + g.data.d3 +
    g.data.d4.e1 + g.data.d4.e2 + g.data.d4.e3;
  console.log(str);
})();
```

### Delegating yield

```js
var gene = require('gene');

function* sub(g) {
  fs.readFile('/path/to/file1', 'utf8', g.cb('d1'));
  fs.readFile('/path/to/file2', 'utf8', g.cb('d2'));
  yield 0;
}

gene(function*(g) {
  yield* sub(g);
  fs.readFile('/path/to/file3', 'utf8', g.cb('d3'));
  fs.readFile('/path/to/file4', 'utf8', g.cb('d4'));
  yield 0;
  var str = g.data.d1 + g.data.d2 + g.data.d3 + g.data.d4;
  console.log(str);
})();
```

### setTimeout

simply
```js
var gene = require('gene');

gene(function*(g) {
  // do something

  yield setTimeout(g.cb(), 100); // wait 100ms

  // do something

  yield setTimeout(g.cb(), 200); // wait 200ms

  // do something
})();
```
parallel
```js
var gene = require('gene');

gene(function*(g) {
  var cb1 = g.cb('d1');
  setTimeout(function() {
    try {
      cb1(null, 'ab');
    } catch (e) {
      cb1(e);
    }
  }, 100);

  var cb2 = g.cb('d2');
  setTimeout(function() {
    try {
      cb2(null, 'cd');
    } catch (e) {
      cb2(e);
    }
  }, 50);

  yield 0; // wait 100ms

  var str = g.data.d1 + g.data.d2;
  console.log(str);   // abcd
})();
```

## License

MIT
