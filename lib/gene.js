'use strict';

module.exports = gene;

function gene(gn) {
  var g = new Gene();
  g.iter = gn(g);
  return function(cb) {
    g.callback = cb;
    g.next();
  };
}

function Gene() {
  this.iter = null;
  this.callback = null;
  this.done = false;
  this.err = null;
  this.nextLock = false;
  this.waitCount = 0;
  this.data = [];
}

Gene.prototype.next = function(err) {
  if (this.done) return;
  this.err = null;
  this.nextLock = true;
  var ret;
  try {
    if (!err) {
      ret = this.iter.next();
    } else {
      ret = this.iter.throw(err);
    }
  } catch(e) {
    return this.end(e);
  }
  this.nextLock = false;
  if (ret.done) return this.end();
  if (this.waitCount) return;
  this.next();
};

Gene.prototype.end = function(err) {
  this.done = true;
  this.callback && this.callback(err || null, this.data);
};

Gene.prototype.cb = function(dataName) {
  this.waitCount++;
  var that = this;
  return function(err) {
    that.waitCount--;

    if (dataName) {
      var result = [].slice.call(arguments, 1);
      if (result.length === 0) {
        that.data[dataName] = undefined;
      } else if (result.length === 1) {
        that.data[dataName] = result[0];
      } else {
        that.data[dataName] = result;
      }
    }

    if (!that.err && err) that.err = err;

    if (that.nextLock) {
      if (err) throw err;
    } else {
      if (that.waitCount === 0) that.next(that.err);
    }
  };
};
