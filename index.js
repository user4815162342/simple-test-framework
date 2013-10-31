
var library = require("./library");
var ResultWriter = require("./ResultWriter");

// TODO: Need a readme.md

/**
 * Creates a test object which can be used to track
 * and output test results. The behavior should be pretty much the
 * same as Test.prototype.test, except that no parent test is
 * involved, and the test results may be automatically output to a stream
 * when done.
 * 
 * If a test body is passed to the method, it will be run asynchronously.
 * Otherwise, the test object will be returned. See Test.prototype.test
 * for a wordier explanation.
 * 
 * The options object allows some configuration of the test and
 * how it is output.
 * Options:
 * - timeout: specifies a timeout for the test, see Test.timeout,
 * or the parameters to Test.prototype.test.
 * - output: specifies an output stream to write the results to, ignored
 * if options.writer is defined. If undefined or null, then stdout will
 * be used.
 * - writer: specifies a writer to collect the results, following the
 * API of ResultWriter. If specifically set to null, the tests will
 * not be output, and the client code will have to know when the test
 * is ended and do something with the results. If undefined, a new 
 * ResultWriter will be used with the value of options.output. 
 * If specified, options.output will be ignored.
 * 
 * Parameters:
 * - name: The name for the test.
 * - options: An optional options object, see above.
 * - body: The body of the test, optional. A function which the new test object will be passed to
 * as a sole parameter. 
 * */
var test = module.exports = function(name,options,body) {
    // switch some arguments for overloading...
    if (typeof options === "function") {
        body = options;
        options = void 0;
    } 
    if (!options) {
        options = {};
    }
    var writer = options.writer;
    if (typeof writer === "undefined") {
        writer = new ResultWriter(options.output);
    }
    
    var done;
    var progressTimer = null;
    if (writer) {
        done = function(reason) {
            // wrap this in an try...catch, since otherwise it will
            // cause an error in the test, but we'll never know about it
            // because outputting doesn't work.
            try {
                clearInterval(progressTimer);
                writer.writeTest(result);
                if (result.isPassed()) {
                    writer.writeComment("Everything's good!",options.output);
                }
            } catch (e) {
                console.error(e.stack);
            }
        }
    }
    var result = new library.Test(name,options.timeout,done);

    if (typeof body === "function") {
        result.run(body);
        if (writer) {
            // Since the output isn't "streaming", there's no way for the
            // test to warn the user that it might take a while, so
            // I want to show that the UI is responsive.
            progressTimer = setInterval(function() {
                writer.showProgress("Running test:");
            },500);
        }
    } else {
        return result;
    }
}
    
// expose the following in case someone wants to use them separately,
// since they're not easily available when installed with npm.
test.Test = library.Test;
test.Checkpoint = library.Checkpoint;
test.Comment = library.Comment;
test.ResultWriter = ResultWriter;

