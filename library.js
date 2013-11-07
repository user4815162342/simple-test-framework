/**
 * This module defines a set of objects which are used to run a test,
 * collect the results and store it for later use.
 * */

 // Require domains to make it possible to look for errors caused by
 // asynchronous tests.
 var domain = require('domain');
 // Require assert for the assertion methods.
 var assert = require('assert');
 
 
 // Default timeout is 5000 milliseconds, or 5 seconds.
 var DEFAULT_TIMEOUT = 5000;
 
 
 /**
  * Defines a Minitest data object which might be added to test results.
  * There is usually no need to create this yourself, as it is created
  * with the Test.prototype.check and catch methods.
  * parameters:
  * - name: The name of the Minitest.
  * - passed: True if the Minitest passed, false if the Minitest failed.
  * */
var Minitest = module.exports.Minitest = function(name,passed) {
    /**
     * The name of the Minitest
     * */
    this.name = name;
    /**
     * True if the Minitest passed, false if the Minitest failed.
     * */
    this.passed = !!passed;
}

/**
 * Defines a comment which might be added to test results. There is
 * usually no need to create this yourself, as it is created with the
 * Test.prototype.error and Test.prototype.comment methods.
 * - kind: What kind of comment. Recognized values are "error" and 
 *   "comment". 
 * - data: The data to use for the comment. Should be a string, or
 *   a JSON compatible object.
 * */
var Annotation = module.exports.Annotation = function(kind,data) {
    /**
     * Indicates the kind of annotation. Recognized values are "error"
     * and "comment". 
     * */
     this.kind = kind;
     /**
      * The data to go along with the annotation.
      * */
     this.data = data;
}

/**
 * Defines a Test and it's results. There is usually no reason to create
 * one yourself, as it is created with the primary test function on this
 * module, as well as the Test.prototype.test function for subtests.
 * Parameters:
 * - name: The name of the test.
 * - timeout: An optional number, in milliseconds, after which the test
 * will automatically time out if no activity has occured. Set to zero 
 * or negative to disable this functionality, although this may cause
 * undesirable results if a test finds an infinite loop. The default value 
 * is 5000.
 * - cb: An optional function to call when the test and all of the
 * subtests are finished. 
 * 
 * */
var Test = module.exports.Test = function(name,timeout,cb) {
    // argument overloading... timeout is optional.
    if (typeof timeout === "function") {
        cb = timeout;
        timeout = void 0;
    }

    // This is a protected functions, since I'm going to need to make sure
    // it's bound and I don't want to bind it again for each new subtest.
    // It's used in Test.prototype.test.
    this._subtestFinished = function(reason,passed) {
        if ((!reason) && passed) {
            this.passed += 1;
        } else {
            this.failed += 1;
        }
        this.pending -= 1;
        if (this.isCompleted()) {
            this._runCleanup();
        }
        // NOTE: Don't increment this.total, that was done at the beginning
        // of the subtest.
    }.bind(this);
    // Need to bind the onError from the prototype to this, since it's
    // used as an event listener.
    this._onError = this._onError.bind(this);
    
    this._clientFinished = cb;
    
    /**
     * The name of the test.
     * */
    this.name = name;
    /**
     * This will contain the subtests, comments and error
     * messages for the test, in the order they were received.
     * */
    this.contents = [];
    /**
     * This should contain the number of passed subtests.
     * */
    this.passed = 0;
    /**
     * This should contain the number of failed subtests.
     * If this is anything other than zero when the test is considered
     * done, then the test is considered to have failed.
     * */
    this.failed = 0;
    /**
     * This should contain the expected number of
     * subtests after a call to finishAfter. It can be used to 
     * determine whether subtests were missed. If this is a number, 
     * and not equal to this.total when the test is finished, then 
     * the test is considered to be incomplete or failed.
     * */
    this.expected = null;
    /**
     * This should contain the total number of subtests
     * added. If this does not match the total of 'passed' and 'failed',
     * then it's possible that a subtest has not yet finished.
     * */
    this.total = 0;
    /**
     * Indicates the number of subtests that have been initiated but
     * haven't finished.
     * */
    this.pending = 0;
    /**
     * This indicates whether the test has been considered finished.
     * Only errors and comments can be added once this is true.
     * */
    this.finished = false;
    /**
     * This indicates the reason for finishing the test. If this
     * is any other value than "done", then the test is considered
     * to have failed. Of course, the test may be considered failed
     * under certain other circumstances as well (see this.expected
     * and this.failed).
     * */
    this.finishReason = null;
    /**
     * Should indicate the number of error annotations added to the
     * contents.
     * */
    this.errors = 0;
    /**
     * Should contain the number of milliseconds after which the test
     * will time out if there is no activity. If this value is zero,
     * then there is no timeout. Setting this after construction will
     * only have an effect after the next call to Test.prototype.ping.
     * */
    this.timeout = (typeof timeout === "undefined") ? DEFAULT_TIMEOUT : timeout;
    
    // Ping this test to initialize the timeout.
    this.ping();
}

/**
 * Wakes up the test, delaying a timeout, in cases where a test may
 * otherwise take a long time to get a result. This function is
 * automatically called by several methods which are intended to
 * indicate activity in a test.
 * */
Test.prototype.ping = function() {
    if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
    } 
    if (!this.finished) {
        if (this.timeout > 0) {
            this._timer = setTimeout(function() {
                this.finish("timeout");
            }.bind(this),this.timeout);
        }
    }
        
}


Test.prototype._onError = function(err) {
    // Report the 'error' first, because finish callbacks will
    // be triggered on the finish.
    this.error(err);
    this.finish("bail");
}

/**
 * This really doesn't need to be called, as it is called automatically
 * by the built-in functions which create tests when a test body is
 * passed. See Test.prototype.test for an explanation of the difference
 * between running a test async vs. sync.
 * 
 * This method runs the specified function in an async manner (using
 * process.nextTick), passing the test object to it. An error occurring 
 * during this function will cause the test to bail, finishing the test. 
 * 
 * Note that there is nothing wrong with calling this method multiple
 * times on the same test (with multiple bodies), as long as 
 * you are aware that 1) it is async and there's no guarantee the bodies
 * will run in order and 2) Any call to the finish method on the test will
 * end the test, making any further calls to run just fill the test result
 * with errors.
 * 
 * NOTE: If you have any use-case for this remaining public, let
 * me know, as it might otherwise be deprecated at some point.
 * 
 * Parameters:
 * - body: A function, which will receive this test as the first parameter
 * when run.
 * */
// NOTE: This is a separate function only because it is used both by 
// Test.prototype.test, but also the main module 'test', and since
// that main method is in a different library, it also has to be
// public. 
Test.prototype.run = function(body) {
    // Try...catch will only catch errors in blocking functions,
    // and on('uncaughtException') would have to be filtered to the
    // appropriate test function...
    // Well, that's pretty much what domains do, so let's use them.
    // 
    // The problem is that domains don't work well with non-async functions,
    // because they behave differently depending on whether the function
    // is in a try...catch or not. Essentially, they use the same mechanism
    // as uncaughtException, so it won't see the exception if it's not
    // *caught*.
    //
    // For a thorough explanation, see:
    // http://www.lighthouselogic.com/node-domains-as-a-replacement-for-try-catch/
    //
    // This means that try..catch *changes* the *behavior* of the non-async
    // code inside the domain. I'm not absolutely certain that this doesn't
    // break a cardinal rule of programming. But, there's no way around
    // it. 
    // 
    // Okay, you say, then don't wrap it in a try..catch. The problem is,
    // I'm writing library code. I can't control the code that another
    // programmer is writing which calls this function. If the programmer
    // encloses the call to this function inside a try..catch, and this
    // can be absolutely at any level of recursion, then suddenly
    // my code breaks and I look bad.
    //
    // Okay, how about do wrap it in try..catch, but depend on domains
    // for the async parts of the code. This doesn't work either, since
    // the test itself might make use of domains. Which means, when the
    // programmer runs their code, it works *differently* in the test
    // then it does in real-life. Again, this makes me look bad once they
    // figure it out.
    //
    // I have come up with no other option than to just run the test
    // async. If the user wishes to run a non-async test, he/she can
    // call the appropriate method without a function body, and
    // control the test directly.
    var d = domain.create();
    var me = this;
    d.on('error',this._onError);
    d.enter();
    process.nextTick(function() {
        body(me);
    });
    d.exit();
    // No, there's no need to clean up the domain after, in 
    // fact domain.dispose is being deprecated.
}

/**
 * Initiates a new subtest. There are two different behaviors, depending
 * on whether a test function is passed.
 * 
 * If a test function is passed, then that function is called 
 * *asynchronously*, with the test object as the body. The test will
 * *not* have run by the time this function returns. However, if the
 * test body throws an exception, or contains asynchronous calls to
 * functions which throw an exception, these exceptions will be caught,
 * and the test will automatically bail.
 * 
 * If a test function is *not* passed, then the test object will be
 * returned from this function for the programmer to manipulate at will, 
 * and no asynchronous calls will be made. The programmer can run 
 * non-async tests easily this way. But, any exception in code will not 
 * be caught by the test, and the test will not automatically bail (but
 * any enclosing tests *might* bail).
 * 
 * Parameters:
 * - name: the name of the test.
 * - timeout: an optional number, in milliseconds, which specifies how
 * long the test will take to timeout.
 * - body: Optional function, which takes the resulting object as a parameter,
 * and which will run the test automatically.
 * */
Test.prototype.test = function(name,timeout,body) {
    // switch some arguments...
    if (typeof timeout === "function") {
        body = timeout;
        timeout = void 0;
    } 
    if (!this.finished) {
        // wake up to avoid a timeout...
        this.ping();
        
        var result = new Test(name,timeout,this._subtestFinished);

        this.contents.push(result);
        // increment pending.
        this.pending += 1;
        // increment total now, even though it hasn't passed or failed yet.
        this.total += 1;
        // since the finish after depends on total value, check
        // if we should be finished.
        this._checkFinishAfter();
        if (typeof body === "function") {
            result.run(body);
        } else {
            return result;
        }
    } else {
        this.error("Subtest '" + name + "' triggered after test was completed");
    }
}

Test.prototype._checkFinishAfter = function() {
    if ((this.expected !== null) &&
         (this.expected <= this.total)) {
       // automatically finish normally.
       this.finish();
    }
}

/**
 * Tells the test to automatically finish after a certain number of tests
 * have been made. If that number of tests hasn't been reached by the
 * time the test times out, or otherwise finishes, the test will be
 * considered incomplete. 
 * 
 * This can be called more than once to change the number of tests that
 * are expected. When increasing, be careful that the test has already
 * completed. When decreasing, this may automatically finish the test
 * if that number of tests are already completed.
 * 
 * Note that if the expected number of tests are not reached, and 
 * finish is never called, then the test will time out.
 * Also note that having more tests than this value when the test is 
 * finished means that the test has not passed.
 * 
 * Parameters:
 * - count: The number of tests to expect.
 * */
Test.prototype.finishAfter = function(count) {
    if (!this.finished) {
        // wake up to avoid a timeout...
        this.ping();
        
        this.expected = count;
        // check if we should finish the test, such as if the user
        // set this to a lower value than the number of tests than
        // have already been made.
        this._checkFinishAfter();
    } else {
        this.error("Expected test count increased by " + count + " after completion.");
    }
}

/**
 * Creates a subtest (a Minitest) that passes immediately. If
 * this is called after the test is finished, an error will be added 
 * instead.
 * 
 * The first parameter is a truthy/falsy value. The value is used as the 
 * pass/fail result of the subtest. 
 * 
 * The return value allows the 'check' to act as a conditional in an
 * if statement. This is useful, for example, to log an error if the
 * subtest fails. Undefined is returned if the test is finished.
 * 
 * Parameters:
 * - result: a boolean indicating whether the subtest 
 * passed (true) or failed (false).
 * - name: The name of the subtest.
 * 
 * Returns: Boolean whether the subtest passed or not, or undefined
 * if the test is already finished.
 * */
Test.prototype.check = function(result,name) {
    if (!this.finished) {
        // wake up to avoid a timeout...
        this.ping();
        
        result = !!result;
        this.contents.push(new Minitest(name,result))
        if (result) {
            this.passed += 1;
        } else {
            this.failed += 1;
        }
        this.total += 1;
        // since the finish after depends on total value, check
        // if we should be finished.
        this._checkFinishAfter();
        return result;
    } else {
        this.error("Minitest '" + name + "' triggered after test was completed");
    }
   
}


/**
 * Adds a subtest to the test based on whether a called function 
 * throws an error. If this is called after the test is finished, an 
 * error will be added instead.
 * 
 * The first parameter is a function, which is run immediately. If it
 * does not throw an exception, then the subtest passes, otherwise
 * it fails. If it does fail, the exception is added as an error.
 * 
 * Note that this function should be synchronous, errors are not caught 
 * if the function is asynchronous. Use a subtest for asynchronous 
 * functions.
 * 
 * The return value allows the 'catch' to act as a conditional in an
 * if statement. This is useful, for example, to log an error if the
 * subtest fails. Undefined is returned if the test is finished.
 * 
 * Parameters:
 * - fn: a function which is checked for
 * throwing an exception (failed) or not (passed).
 * - name: The name of the subtest.
 * 
 * Returns: Boolean whether the subtest passed or not, or undefined
 * if the test is already finished.
 * */
Test.prototype.catch = function(fn,name) {
    if (!this.finished) {
        // wake up to avoid a timeout...
        this.ping();
        
        var result;
        if (typeof fn === "function") {
            try {
                fn();
                result = true;
            } catch (e) {
                error = e;
                result = false;
            }
            result = this.check(result,name);
            if (error) {
                this.error(error);
            }
            return result;
        }
    } else {
        this.error("Minitest '" + name + "' triggered after test was completed");
    }
   
}



// NOTE: I'm not using EventEmitters mostly because I want to avoid
// drawing in stuff I don't really need. I need to handle adding functions,
// but I don't need to alert about anything but the test finishing,
// and I don't need the functionality for removing listeners.
Test.prototype._runCleanup = function() {
    if (this._cleanup) {
        while (this._cleanup.length > 0) {
            try {
                this._cleanup.shift()();
            } catch (e) {
                this.error(e);
            }
        }
    }
    if (typeof this._clientFinished === "function") {
        this._clientFinished(this.finishReason,this.isPassed())
    }
}

/**
 * Returns true if the test has met all of the criteria for passing:
 * - test is complete
 * - finishReason is falsy
 * - failed is 0
 * - errors is 0 (yes, all of the tests and checks passed, but 
 *   an error should only be passed if something isn't right)
 * */
Test.prototype.isPassed = function() {
    return (this.isCompleted()) &&
            (!this.finishReason) &&
            (this.failed === 0) &&
            (this.errors === 0) &&
            ((this.expected === null) ||
             (this.expected === this.total));
             // If expected > total, then it failed.
}

/**
 * Returns true if the test meets all criteria for being complete.
 * - finished is true
 * - pending is 0
 * - expected is null or total
 * */
Test.prototype.isCompleted = function() {
    return (this.finished) &&
            (this.pending === 0) &&
            ((this.expected === null) ||
             (this.expected >= this.total));
             // Test is completed if expected is greater than total,
             // but it will still fail.
}



/**
 * Used to indicate that the test is considered done. If there are no
 * pending subtests, the parent will also be notified that it is done.
 * If there are pending subtests, this notification will happen when
 * those subtests are done.
 * 
 * If no reason is passed, the test is considered to have ended normally.
 * Passing a reason indicates an abnormal end. This value may be any
 * string. The Test code itself makes use of the following strings:
 * - "bail": An uncaught exception aborted the test.
 * - "timeout": The test did not complete in a timely manner.
 * 
 * Parameters:
 * - reason: a string indicating the reason for completion, or none if
 * the test completed normally. Recognized values are:
 *   - "bail" if the test was finished due to an exception
 *   - "timeout" if the test was stopped because it was taking too long. 
 * Other values will be allowed, however.
 * */
Test.prototype.finish = function(reason) {
    if (!this.finished) {
        this.finished = true;
        // this should clear the timeout, to prevent it from occurring again.
        this.ping();
        
        this.finishReason = reason;
        // Need to put a comment in right here, so we know where it bailed.
        if (this.finishReason) {
            switch (this.finishReason) {
                case "bail":
                    this.error("Test bailed due to an uncaught exception.");
                    break;
                case "timeout":
                    this.error("Test timed out due to no activity in " + this.timeout + " milliseconds.");
                    break;
                default:
                    this.error("Test finished abnormally, reason given was '" + this.finishReason + "'");
            }
        }
        
        if (this.isCompleted()) {
            this._runCleanup();
            // Otherwise, wait for the subtests to complete themselves.
        }
    } else {
        this.error("An extra attempt was made to finish the test, the reason this time was: '" + reason + "'")
    }
    
}

/**
 * Adds a function that will be called when the test is finished, which
 * is useful for cleaning up resources. The function will receive no 
 * parameters. This function will be called after the test has been
 * marked as finished, and after all subtest's have reported as 
 * finished, but before this test reports to it's parents as finished. 
 * 
 * If multiple cleanup functions are added, they will be called in the
 * order that they were added.
 * 
 * Cleanup functions are expected to be synchronous.
 * 
 * Parameters:
 * - fn: A function to be called on cleanup.
 * */
Test.prototype.cleanup = function(fn) {
    if (typeof fn === "function") {
        if (!this._cleanup) {
            this._cleanup = [fn];
        } else {
            this._cleanup.push(fn);
        }
    }
}


 
/**
 * Adds an comment annotation to the test results. 
 * Parameters:
 * - data: The data for the comment. This can be any type of object,
 * as long as it can be stringified to JSON.
 * */
Test.prototype.comment = function(data) {
    // wake up to avoid a timeout...
    this.ping();
    this.contents.push(new Annotation("comment",data));
}

/**
 * Adds an error message to the test results. 
 * Parameters:
 * - data: The data for the error. This can be any type of object,
 * as long as it can be stringified to JSON.
 * */
Test.prototype.error = function(data) {
    // wake up to avoid a timeout...
    this.ping();
    this.contents.push(new Annotation("error",data));
    this.errors += 1;
}

