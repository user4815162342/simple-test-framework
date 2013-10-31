#!/usr/bin/node
/**
 * The tests for simple-test-framework.
 * */

// TODO: If the test below bails before one of the subject tests timeout,
// especially with that long timeout one, then the console hangs until
// that test times out, with no notification to the user. This might
// be a great use for a teardown function. So, maybe that's a feature
// I *do* need here.

// Make sure all of the units are pulled in here, instead of dynamically
// by test. It makes finding syntax errors a lot easier.
var library = require("./library");
var ResultWriter = require("./ResultWriter");
var test = require("./index");

var mockOutput = { write: function() {} }

var assert = require('assert');

var deepEqual = function(actual,expected) {
    // FUTURE: There's probably a better way to check deep equality,
    // but I don't want to re-write code that's already written,
    // nor require extra modules I don't need.
    try {
        assert.deepEqual(actual,expected);
        return true;
    } catch (e) {
        if (e instanceof assert.AssertionError) {
            return false;
        }
        throw e;
    }
}


test("Test simple-test-framework",function(t) {
    
    var subject;
    subject = new library.Checkpoint("Foo",true);
    t.check(subject.name === "Foo","Checkpoint has correct value for name");
    t.check(subject.passed === true,"Checkpoint has correct value for passed.");
    subject = new library.Checkpoint("Foo","Hello!");
    t.check(subject.passed === true,"Checkpoint constructor interpets passed argument correctly.")
    
    subject = new library.Annotation("comment",23);
    t.check(subject.kind === "comment","Annotation has correct kind");
    t.check(subject.data === 23,"Annotation has correct value for data");
    
    // Now, start testing the test object itself.
    // name, timeout, cb
    subject = new library.Test("Foo",4000);
    t.check(subject.name === "Foo","Test object has correct name.");
    t.check(subject.timeout === 4000,"Test object has correct value for timeout");
    if (!t.check(deepEqual(subject.contents,[]),"Test object has correctly initialized contents")) {
        t.error("Value of contents:");
        t.error(subject.contents);
    }
    t.check(subject.passed === 0,"Test object has correctly initialized passed value");
    t.check(subject.failed === 0,"Test object has correctly initialized failed value");
    t.check(subject.expected === null,"Test object has correctly initialized expected value");
    t.check(subject.total === 0,"Test object has correctly initialized total value");
    t.check(subject.pending === 0,"Test object has correctly initialized pending value");
    t.check(subject.finished === false,"Test object has correctly initialized finished value");
    t.check(subject.finishReason === null,"Test object has correctly initialized finishReason value");
    t.check(subject.errors === 0,"Test object has correctly initialized errors value")
    // Make sure that this test is finished, so we don't have the timeout hanging out.
    subject.finish();
    
    subject = new library.Test("Foo");
    t.check(subject.timeout === 5000,"Test timeout should default to 5000");
    subject.finish();
    t.check(!subject._timer,"Finishing a test clears it's timer.");

    // Now, let's do some timeout testing, how about in async,
    // so we can control the timeout.
    // Set the timeout on this test really high, because we might have
    // to wait a few seconds for some of these tests.
    t.test("Tests with a timeout of 0 should never time out.",7000,function(t) {
        
        // Make sure 0 timeout does not timeout.
        var noTimeout = new library.Test("This test should have no timeout",0,function(reason) {
            t.check(reason !== "timeout","Test with 0 timeout should not timeout");
            t.finish();
        });
        
        // make sure the timeout property was initialized correctly.
        t.check(noTimeout.timeout === 0,"Test with 0 timeout should initialize timeout to 0.");
        t.check(!noTimeout._timer,"Test with 0 timeout should not have a timer.");

        // Yes, this is not a true test, since we finish it outselves. But, a true
        // test of whether no timeout works would literally take forever.
        setTimeout(function() {
            noTimeout.finish();
        },6000)
    });    
    
    t.test("Tests without a non-zero timeout should time out eventually.",7000,function(t) {
        var timer;
        var startTime = Date.now();
        t.comment("Start time: " + startTime);
        var timeoutSubject = new library.Test("This test should timeout in about 2000 milliseconds.",2000,function(reason) {
            var endTime = Date.now();
            t.comment("End time: " + endTime);
            if (timer) {
                clearTimeout(timer);
            }
            t.check(reason === "timeout","Test with 2000 timeout should timeout");
            var diff = (endTime - startTime)
            if (!t.check(Math.round(diff/1000) === 2,"Test with 2000 timeout should timeout in about 2 seconds.")) {
                t.error("Test timed out in " + diff + " milliseconds.");
            }
            t.finish();
        });
        t.check(timeoutSubject.timeout === 2000,"Test with 2000 timeout should initialize to 2000.");
        t.check(timeoutSubject._timer,"Test with 2000 timeout should have a timer after construction");
        
        // Tell the test to finish after 6 seconds, it should timeout before that.
        timer = setTimeout(function() {
            if (!timeoutSubject.finished) {
                timeoutSubject.finish();
            }
        },6000);
    });
    
    // //   - Make sure that calling ping delays the timeout.
    t.test("Calling ping resets the timeout",function(t) {
        var timer;
        var startTime = Date.now();
        t.comment("Start time: " + startTime);
        var timeoutSubject = new library.Test("This test should timeout in about 2000 milliseconds.",2000,function(reason) {
            var endTime = Date.now();
            t.comment("End time: " + endTime);
            if (timer) {
                clearTimeout(timer);
            }
            t.check(reason === "timeout","Test with 2000 timeout should timeout after last activity");
            var diff = (endTime - startTime)
            // if the timer didn't reset after the ping, then this should be closer to 1 second.
            if (!t.check(Math.round(diff/1000) === 2,"Test with 2000 timeout should timeout in about 2 seconds.")) {
                t.error("Test timed out in " + diff + " milliseconds.");
            }
            t.finish();
        });
        t.check(timeoutSubject.timeout === 2000,"Test with 2000 timeout should initialize to 2000.");
        t.check(timeoutSubject._timer,"Test with 2000 timeout should have a timer after construction");

        // Ping the test after about a second
        timer = setTimeout(function() {
            if (!timeoutSubject.finished) {
                timeoutSubject.ping();
                // reset startTime to make sure the timeout is correct.
                startTime = Date.now();
            }
            // Tell the test to finish after 6 seconds, it should timeout before that, however.
            timer = setTimeout(function() {
                if (!timeoutSubject.finished) {
                    timeoutSubject.finish();
                }
            },6000);
        },1000);         
    });

    
    t.test("Nested test should notify their parents when they're done.",function(t) {
        // Use the 'test' method with *no* output here.
        test("Level 1",{ writer: null },function(level1) {
            level1.test("Level 2",function(level2) {
                t.check(level1.pending === 1,"Initiating a sub-test increments pending on parent.")
                t.check(level1.total === 1,"Initiating a sub-test increments the total on parent.");
                level2.test("Level 3",function(level3) {
                    level3.check(true,"Suppose that this checkpoint succeeded, which should cause the parent to see a successful test later.");
                    t.check(level2.pending === 1,"Initiating a second-level sub-test increments pending on its parent.");
                    t.check(level2.total === 1,"Initiating a second-level sub-test increments total on its parent.");
                    level3.finish();
                    t.check(level2.pending === 0,"Finishing a second-level sub-test decrements pending on its parent.");
                    t.check(level2.passed === 1,"Finishing a successful sub-test increments passed on it's parent.");
                    t.check(level2.failed === 0,"Finishing a successful sub-test doesn't increment failed on it's parent.");
                    level2.check(false,"Suppose that this checkpoint failed, which should cause the parent to see a failed test later..");
                    level2.finish();
                    t.check(level1.pending === 0,"Finishing a sub-test decrements pending on its parent.");
                    t.check(level1.failed === 1,"Finishing a failed sub-test increments failed on it's parent.");
                    t.check(level1.passed === 0,"Finishing a failed sub-test doesn't increment passed on it's parent.");
                    // finish level2 to clear timeout.
                    level1.finish();
                    t.finish();
                });
            });
        });
        
    });
    
    t.test("Nested tests should not notify their parents until any pending tests are done.",function(t) {
        // Use the 'test' method with *no* output here.
        test("Level 1",{writer: null },function(level1) {
            level1.test("Level 2",function(level2) {
                level2.test("Level 3",function(level3) {
                    t.check(level1.pending === 1,"Just make sure that level1 is waiting on a test.");
                    level2.finish();
                    t.check(level1.pending === 1,"If a subtest is waiting on its own subtest, it shouldn't notify it's parent that it's finished until after that test is complete.");
                    level3.finish();
                    t.check(level1.pending === 0,"Once a second-level subtest is complete, and it's parent is finished, then the grandparent should be notified that the parent is finished.");
                    // finish to clear the timeout.
                    level1.finish();
                    t.finish();
                });
            });
        });
    });
    
    t.test("Tests should bail on exception",function(t) {
        t.addExpected(6);
        var worked = false;
        var subject = new library.Test("subject",function(reason) {
            // 1
            t.check(worked,"Calling run with a function runs that function.");
        });
        subject.run(function(t) {
            worked = true;
            t.finish();
        });
        var thrownFinished = true;
        subject = new library.Test("subject",function(reason) {
            thrownFinished = true;
            // 2
            t.check(reason === "bail","Calling run with a function that throws an error causes that test to 'bail'");
        });
        setTimeout(function() {
            // 3
            t.check(thrownFinished,"Calling run with a function that throws an error causes that test to finish, without interrupting code.");
        },500);
        subject.run(function() {
            throw new Error("Oops!");
        });
        
        var throwError = function() {
            throw new Error("Yikes!");
        }
        subject = new library.Test("subject",function(reason) {
            // 4
            t.check(reason === "bail","Calling run with a function that calls a function which throws an error causes that test to 'bail'");
        });        
        subject.run(function() {
            throwError();
        });
        
        subject = new library.Test("subject",function(reason) {
            // 5
            t.check(reason === "bail","Calling run with a function that calls an async function which throws an error in the callback causes that test to 'bail'");


        });
        subject.run(function() {
            setTimeout(throwError,500);
        });
        
        subject = new library.Test("subject",function(reason) {
            // 6
            t.check(reason === "bail","Calling run with a function that calls an async function which calls a function which throws an error causes that test to 'bail'");
            
        });
        subject.run(function() {
            process.nextTick(function() {
                throwError();
            });
        });
        // FUTURE: It would be nice to verify that exceptions outside of
        // the body do not cause the test to fail, but I don't see
        // how I can test that without breaking the main test (because
        // an exception was thrown). 
                
    });
    
    // This one is just something I wanted to make sure works,
    // because I ran across this while trying to figure out domains.
    // http://stackoverflow.com/questions/19461234/domains-not-properly-catching-errors-while-testing-nodejs-in-mocha
    var domainFn = function(done) {
        var domain = require("domain");
        var d = domain.create();
        d.on("error",function() {
            done();
        });
        d.run(function() {
            throw new Error("Foo");
        });
    }
    
    t.test("Domain errors should be caught and not break test.",function(t) {
        domainFn(function() {
            t.finish();
        });
    });
    
    t.test("The test function works",function(t) {
        var subject = new library.Test("subject");
        var subtest = subject.test("subtest");
        t.check(typeof subtest !== "undefined","Calling test without a body returns the test object.");
        t.check(subject.contents.length == 1,"Calling test adds an item to the parent test's contents.");
        t.check(subject.contents[0] instanceof library.Test,"Calling test adds a Test object to the parent test's contents.");
        t.check(subject.contents[0] === subtest,"Calling test without a body returns the test object which is also added to the parent test's contents.");
        subtest.finish();
        subtest.test("broken test");
        t.check(subtest.contents.length == 1,"Calling test on a finished test adds an item to the parent test's contents.");
        t.check(subtest.contents[0] instanceof library.Annotation,"Calling test on a finished test adds an Annotation object to the parent test's contents.");
        t.check(subtest.contents[0].kind === "error","Calling test on a finished test adds an error Annotation object to the parent test's contents.");
        subject.finish();
        t.finish();
    });
    
    t.test("The 'expected' feature works.",function(t) {
        var testFinished = false;
        var subject = new library.Test("subject",function(reason) {
            testFinished = true;
        });
        subject.addExpected(2);
        t.check(subject.expected === 2,"Calling addExpected the first time sets the value of expected to the supplied argument.");
        subject.addExpected(1);
        subject.addExpected(3);
        t.check(subject.expected === 6,"Calling addExpected thereafter adds the specified argument to the existing expected.");
        subject.test("1").finish();
        subject.check(true,"2");
        subject.check(false,"3");
        subject.test("4").finish();
        subject.test("5").finish();
        subject.test("6").finish();
        t.check(testFinished,"Adding tests and checks will cause a test to automatically finish if expected is set and the expected number of items are seen.");
        t.finish();
    });
    
    t.test("The check function works.",function(t) {
        var subject = new library.Test("subject");
        var check = subject.check("Truthy","subtest");
        t.check(check === true,"Calling check returns the truthy value of the condition.");
        t.check(subject.contents.length == 1,"Calling check adds an item to the parent test's contents.");
        t.check(subject.contents[0] instanceof library.Checkpoint,"Calling check adds a Chekcpoint object to the parent test's contents.");
        t.check(subject.contents[0].name === "subtest","Calling check adds a Checkpoint object with the specified name.");
        t.check(subject.contents[0].passed === true,"Calling check adds a Checkpoint object with the specified pass result.");
        t.check(subject.passed === 1,"Calling check increments passed value appropriately.");
        t.check(subject.total === 1,"Calling check increments total value appropriately.");
        subject.check(false,"Nay!");
        t.check(subject.failed === 1,"Calling check increments failed value appropriately.");
        
        // handle functions as the result parameter
        subject.check(function() {},"Does not throw");
        t.check(subject.contents[2] instanceof library.Checkpoint,"Calling check with function adds a Chekcpoint object to the parent test's contents.");
        t.check(subject.contents[2].name === "Does not throw","Calling check with function adds a Checkpoint object with the specified name.");
        t.check(subject.contents[2].passed === true,"Calling check with function that does not throw adds a Checkpoint object with the specified pass result.");
        t.check(subject.passed === 2,"Calling check with a function increments passed value appropriately.");
        t.check(subject.total === 3,"Calling check with a function increments total value appropriately.");
        
        subject.check(function() { throw "Oops!" }, "Does throw");
        t.check(subject.contents[3] instanceof library.Checkpoint,"Calling check with function that throws  adds a Chekcpoint object to the parent test's contents.");
        t.check(subject.contents[3].name === "Does throw","Calling check with function that throws adds a Checkpoint object with the specified name.");
        t.check(subject.contents[3].passed === false,"Calling check with function that throws adds a Checkpoint object that failed.");
        t.check(subject.failed === 2,"Calling check with a function that throws increments failed value appropriately.");
        t.check(subject.total === 4,"Calling check with a function increments total value appropriately.");
        
        t.check(subject.contents[4] instanceof library.Annotation,"Calling check with function that throws adds an Annotation object to the parent test's contents.");
        t.check(subject.contents[4].kind === "error","Calling check with function that throws adds an error Annotation.");
        t.check(subject.errors === 1,"Calling check with a function that throws increments the errors value appropriately.");
        
        subject.finish();
        subject.check(true,"This should be an error.");
        t.check(subject.contents.length == 6,"Calling check on a finished test adds an item to the parent test's contents.");
        if (!t.check(subject.contents[5] instanceof library.Annotation,"Calling check on a finished test adds an Annotation object to the parent test's contents.")) {
            t.error(subject.contents[5]);
        }
        t.check(subject.contents[5].kind === "error","Calling check on a finished test adds an error Annotation object to the parent test's contents.");
        t.finish();
    });
    
    t.test("The finish function works.",function(t) {
        var subject = new library.Test("subject");
        subject.finish("Bwahaha!");
        t.check(subject.finished,"Calling finish marks a test as finished.");
        t.check(subject.finishReason === "Bwahaha!","Calling finish with a reason sets finishReason");
        t.check(subject.contents.length == 1,"Calling finish with a reason adds an item to the test's contents.");
        if (!t.check(subject.contents[0] instanceof library.Annotation,"Calling finish with a reason adds an Annotation to the test's contents.")) {
            t.error(subject.contents[0]);
        }
        t.check(subject.contents[0].kind === "error","Calling finish with a reason adds an error Annotation to the test's contents.");
        subject = new library.Test("Second");
        subject.finish();
        subject.finish();
        t.check(subject.contents.length == 1,"Calling finish twice adds an item to the test's contents.");
        if (!t.check(subject.contents[0] instanceof library.Annotation,"Calling finish twice adds an Annotation to the test's contents.")) {
            t.error(subject.contents[0]);
        }
        t.check(subject.contents[0].kind === "error","Calling finish twice adds an error Annotation to the test's contents.");
        t.finish();
    });
    
    t.test("Annotation features work",function(t) {
        var subject = new library.Test("subject");
        subject.comment("This is a comment.");
        t.check(subject.contents.length == 1,"Calling comment adds an item to the test's contents.");
        if (!t.check(subject.contents[0] instanceof library.Annotation,"Calling comment adds an Annotation to the test's contents.")) {
            t.error(subject.contents[0]);
        }
        t.check(subject.contents[0].kind === "comment","Calling comment adds an comment Annotation to the test's contents.");
        subject.error("This is an error.");
        t.check(subject.contents.length == 2,"Calling error adds an item to the test's contents.");
        if (!t.check(subject.contents[1] instanceof library.Annotation,"Calling error adds an Annotation to the test's contents.")) {
            t.error(subject.contents[1]);
        }
        t.check(subject.contents[1].kind === "error","Calling error adds an error Annotation to the test's contents.");
        t.check(subject.errors === 1,"Calling error increments the error count.");
        subject.finish();
        t.finish();
    });
    
   
    t.test("ResultWriter works.",function(t) {
        var subject = new library.Test("subject");
        // put some things in that would cause it to use different
        // methods and conditions.
        subject.test("subtest").finish();
        subject.check(true,"Passed");
        subject.check(false,"Failed");
        subject.error("An error occurred.");
        subject.comment("This is a comment.");
        subject.comment({ foo: "bar", fie: "foo" });
        subject.error(new Error("Foo"));
        subject.finish();
        t.check(function() {
            new ResultWriter(mockOutput).writeTest(subject);
        },"ResultWriter does not throw an error when writing results out.");
        t.finish();
    });
    
    t.test("main test function.",function(t) {
        var subject = test("Subject",{
            output: mockOutput
        });
        // Use a domain to check for errors in the output.
        t.check(function() {
            subject.finish();
        },"Running a simple test from the main test function does not throw an error, even when writing to a stream.");
        t.finish();
    });
    
    
// Features to be tested yet:
// - make sure an error comment shows the stack trace of the error,
//   as well as other things.

   t.finish();

});

