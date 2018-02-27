
var should = require('should');
var Aggregator = require('../../lib/Interactor/TransactionAggregator.js');
var Utility = require('../../lib/Interactor/Utility.js');
var TraceFactory = require('./misc/trace_factory.js');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

describe('StackTrace Utility', function() {
  var aggregator;
  var stackParser;

  it('should instanciate context cache', function() {
    var cache = new Utility.Cache({
      miss: function (key) {
        try {
          var content = fs.readFileSync(path.resolve(key));
          return content.toString().split(/\r?\n/);
        } catch (err) {
          return undefined;
        }
      }
    })

    stackParser = new Utility.StackTraceParser({ cache: cache, context: 2});
  });

  it('should instanciate aggregator', function() {
    aggregator = new Aggregator({ stackParser: stackParser});
  });

  describe('.parse', function() {
    it('should parse stacktrace and get context', function(done) {
      var obj = [{
        labels: {
          stacktrace: JSON.stringify(TraceFactory.stacktrace)
        }
      }];

      aggregator.parseStacktrace(obj);
      obj[0].labels['source/file'].indexOf('test/interface/misc/trace_factory.js:10').should.be.above(0);
      should(obj[0].labels['source/context']).eql("var random_routes = [\n  '/api/bucket',\n>>'/api/bucket/users',\n  '/api/bucket/chameau',\n  '/backo/testo'");
      done();
    });

    it('should handle malformated stacktraces', function() {
      aggregator.parseStacktrace([{
        labels: {
          stacktrace: JSON.stringify({
            stack_frame: [{
              line_number: 10,
              column_number: 10,
              method_name: '<anonymous function>'
            }, {
              file_name: 'node_modules/express.js',
              column_number: 10,
              method_name: '<anonymous function>'
            }, {
              file_name: path.resolve(__dirname, 'trace_factory.js'),
              line_number: 10,
              column_number: 10,
              method_name: '<anonymous function>'
            }]
          })
        }
      }]);
    });

    it('should handle malformated stacktrace v1', function() {
      aggregator.parseStacktrace([{
        labels: {
          stacktrace: JSON.stringify({
            stack_frame: [{
              file_name: 'events.js'
            },{
              file_name: 'node_modules/express.js'
            },{
              file_name: path.resolve(__dirname, 'trace_factory.js')
            }]
          })
        }
      }]);
    });

    it('should handle malformated stacktrace v2', function() {
      aggregator.parseStacktrace([{
        labels: {
          stacktrace: JSON.stringify({
            stack_frame: [{
              file_name: 'events.js',
              column_number: 10,
              method_name: '<anonymous function>'
            },{
              file_name: 'node_modules/express.js',
              column_number: 10,
              method_name: '<anonymous function>'
            },{
              file_name: path.resolve(__dirname, 'trace_factory.js'),
              line_number: 10,
              column_number: 10,
              method_name: '<anonymous function>'
            }]
          })
        }
      }]);
    });

    it('should handle malformated stacktrace v3', function() {
      aggregator.parseStacktrace([{
        labels: {}
      }]);
    });

    it('should handle malformated stacktrace v4', function() {
      aggregator.parseStacktrace([{
      }]);
    });

    it('should handle malformated stacktrace v5', function() {
      aggregator.parseStacktrace([]);
    });

    it('should handle malformated stacktrace v5', function() {
      aggregator.parseStacktrace();
    });

  });

  describe('.attachContext', function () {
    it('should extract context from stackframes', function () {
      var error = stackParser.attachContext({
        stackframes: [
          {
            file_name: '/toto/tmp/lol',
            line_number: 10
          }
        ]
      });
      assert(error !== undefined);
      assert(error.stackframes === undefined);
      assert(error.callsite !== undefined);
      assert(error.callsite.indexOf('/toto/tmp/lol') >= 0);
    });

    it('should extract context from the stack string', function () {
      var error = new Error();
      // stack is lazy so we need to load it
      error.stack = error.stack;
      error = stackParser.attachContext(error);
      assert(error !== undefined);
      assert(error.stackframes === undefined);
      assert(error.callsite.indexOf(__filename) >= 0);
      assert(error.context.indexOf('var error = new Error()') >= 0);
    });
  });
});
