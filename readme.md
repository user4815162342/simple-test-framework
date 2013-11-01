## Simple Test Framework

Another lightweight testing utility for node. 

## Introduction

**Simple Test Framework** (**STF**) is is a library for testing
functionality of JavaScript code in Node and writing those results out
to a stream in human-readable format. STF is easy to set up and use,
and tests itself. 

If you want anything beyond this, STF doesn't do it, and won't at
anytime in the future. *But*, it may be easily combined with other
code and libraries to get this feature.

* STF is a library, not a command-line tool.
* STF is a library for testing, not assertions, mock-ups or spies.
* STF tests functionality, not code coverage, stress, etc.
* STF tests JavaScript code, not HTML, CSS, C++, bash, etc.
* STF tests JavaScript in node, not a browser, or rhino, etc.
* STF writes results to a stream, not to a server request, database, etc.
* STF writes results in a human-readable format, not HTML, XML, JSON, YAML, etc.

Not that I have anything against any of these features. I just want to
keep this library as simple as possibly, while still providing useful
features specific to testing.

# Features:

* Tests can be run async or sync.
* Tests can be nested.
* Async tests make use of domains to catch errors and automatically fail
tests.
* Tests can automatically time out if no activity occurs for a certain
amount of time.
* Tests can be specifically finished, or they can be told how many
checks to expect and finish automatically once this count is reached.
* Subtests can pass/fail based on a single condition, or based on whether
a function throws an error or not.
* Comments and errors may be added to the results. 
* Comments and errors may be either strings or objects, and objects are
inspected to produce output.
* Results output is minimized for completed tests which have no errors 
or failures.
* The code behind the API is available for more direct access, if
the programmer wants it.

## Getting Started

### To install simple-test-framework into your current node project:

Download the source and place in a place where your node package
can reach it.

Registry on npm is forthcoming, at which point you'll be able to do:

```bash
npm install simple-test-framework
```

### To create a test:

Create a javascript file that contains your test. The following is
a sample that should give you a good idea of how to use STF. See
below for a more thorough explanation of the API.

```javascript
var test = require("simple-test-framework");

test("Your project works",function(t) {

   var a = 1;
   t.check(a === 1,"a equals 1");
   t.test("Your subtest succeedes",function(t) {
   
      t.check(a === 1,"a still equals 1");
      
      t.finish();
   });
   
   t.finish();
})
```

### To plug your test into your npm package:

*package.json*
```json
{
  ...
  "scripts": {
    "test": "node test.js"
  },
  "devDependencies": {
     "simple-test-framework": "*"
  }
  ...
}
```

### Run your test

If you are using a package.json file:

```bash
npm test
```

Otherwise:
```
node test.js
```

Either way will work.

## API

The primary API is briefly described here. For a more thorough 
explanation of all public functions, including a few methods and
objects which do not appear here because they aren't expected to be 
used often, please see the source code.

Note that this API, while it works, is considered "unstable", in the
sense of the word used by the Node API documentation. It may change
at some point in the future.

### Module simple-test-framework

`test = require('simple-test-framework')`


### test

`function test(name[, options][, body]) [Test]`

* **name:** `string` The name for the test, as output to stream.
* **options:** `object` Options for controlling the test and output.
* **body:** `function` Optional body for asynchronous test.

Creates a 'root' test object, writing the results to a stream when that
test is finished. Except for writing to a stream, the behavior is the
same as calling `test` on a `Test` object.

##### Parameter options

* **options.timeout:** `number` Specifies the number of milliseconds
after which the Test will time out due to no activity. Defaults to
5000, or 5 seconds.
* **options.writer:** `object` Specifies a writer to write the results
to when the test is finished. This object must provide the same API as
`ResultWriter` (see source code). If not set, a ResultWriter
will be used. If specifically set to null, then the test results will
not be output.
* **options.output:** `writable stream` Specifies the stream to write 
the results of the Test to. This property is ignored if options.writer
is set. If not defined, results will be written to `process.stdout`.
Although a writeable stream is suggested, all that is really expected is
an object that contains a `write` method, that takes a `String`.
argument.

##### Parameter body

`function(Test)`

If a test body is passed to the method, that function will be run
asynchronously, with the new Test object being passed to the function.
See `Test.test` for more details.

If a test body is not passed to the function, then the new Test object 
will be returned from the function, to be used synchronously.

##### Returns 

`[Test]`

If no test body is passed to the function, the Test object will be
returned by the function.

### Class Test

#### test

`function(name,[timeout],[body]) [Test]`

Creates a subtest on the current test.

* **name** `string` The name of the new subtest.
* **timeout** `number` Optional number of milliseconds after which the test
will time out if there's no activity. Defaults to 5000 milliseconds.
Pass 0 to turn this feature off, if you're absolutely certain about what's
going to happen.
* **body** `function` Optional function body for asynchronous test.

After testing code is completed, your test should call the finish
method to indicate that it finished normally, or use the expected 
feature, otherwise it will not end until the test times out.

After a subtest is finished, it's parent test will be notified
whether it passed or failed. 

**asynchronous mode:**
If a test body is passed to this function, the test will be scheduled
to run asynchronously. Even synchronous code in the test body will not
happen until a later cycle of the node event loop. 

The primary benefit of asynchronous mode, is that unexpected errors 
occurring during this test will be logged and cause the test to bail.
This is true even if the error occurs in asynchronous functions like 
setTimeout or file system calls.

**synchronous mode:**
If a test body is not passed, then the Test object will be returned
from the function, and can be controlled synchronously. The timeout
functionality will still work, but any exceptions that occur will not
automatically bail out the test. 

#### check

`function(condition,name) boolean`

Creates a simple subtest on the current test that is automatically
finished and passed based on the condition. This is very similar to
`assert.ok` as it is used in other test frameworks.

* **condition** `boolean` Indicates whether the test has passed
or failed. 
* **name** `string` The name of the test.

Usually, an expression is used here to check the value of a variable 
to determine if the test passed. 

#### catch

`function(fn,name) boolean`

Creates a simple subtest based on the success of a function. This is
similar to how `assert.doesNotThrow` is used in other test frameworks.

* **fn** `function` A synchronous function that will be called
immediately.
* **name** `string` The name of the subtest.

The passed function will be called immediately. If it throws an error,
the subtest will fail, and the error will be logged to the test. 
If it does not, then the checkpoint will pass. 

If the function calls async functions, errors occurring in them will
not be seen. Use `test` to handle async tests like this.

#### cleanup

`function(fn)`

Adds cleanup code to the test. 

* **fn** `function` A function that will be called when the test 
finishes.

This is where you would place code that needs to be run to release
resources after a test is finished, whether the test fails or not.
More than one cleanup function can be added. 

Cleanup functions will be called, in the order they were declared,
after the test and all of it's subtests are finished, but before
the parent test is notified of this test finishing.

#### addExpected

`function(count)`

Increments the expected number of subtests. 

* **count** `number` The number of additional expected tests.

This is similar to the `plan` feature of other test frameworks. Once
the total number of items has reached the expected number, the test
will automatically finish itself.

The main use of this feature is to specify the number of checks that
are expected, so that you don't need to explicitly call finish when 
all of them have been declared. This is most useful if you need to 
initiate subtests  in asynchronous code that may get
called later than your call to `finish`.

Unlike other test frameworks, it is possible to add more expected tests
after the value is initially set. This allows you to conditionally add
expected tests as you need them.

#### finish

`function([reason])`

Finishes the test.

* **reason** `string` A reason for finishing a test, if the test is
not finishing normally.

Every test must be finished before results can be shown. Finishing a
test causes cleanup to occur, and the parent test to be notified of the
test's results.

Once this method is called, the parent test is not notified until after
all subtests of this test have finished. This ensures that the parent
test can know whether this test has passed or failed.

Passing a reason to this method indicates that the test did not finish
normally, meaning that it failed. Any string can be passed to this 
method, but the primary use of the reason argument is to indicate 
whether the test timed out (`reason = "timeout"`) or bailed due to
an uncaught exception (`reason = "bail"`).

#### comment

`function(data)`

Adds a comment message to the results.

* **data** `Object` A piece of data that will be stored in the results.

The comment can be any object. If a non-string object is passed, a 
summary of the object and it's field values will be written to the
output. If an Error is passed, it's stack trace will also be written
out.

#### error

`function(data)`

Adds an error message to the results.

* **data** `Object` A piece of data that will be stored in the results.

This works almost exactly as `comment`, with two primary differences.
First, any errors added to the results causes the test to fail, even
if all subtests passed. Second, the output of the
error will be formatted to stand out more than a comment.

#### isPassed

`function() boolean`

Returns true if the test was successful, false if not.

A test is successful only if it meets all of the following criteria:
* It is completed (`isCompleted` returns true)
* It finished normally (no parameter was passed to `finish`)
* None of it's subtests have failed.
* No error messages were added.
* Either `addExpected` was never called, or the number of tests 
declared is the same as what was expected tests have 
been declared.

#### isCompleted

`function() boolean`

Returns true if the test is completed, false if not.

A test has completed only if it meets all of the following criteria:
* `finish` has been called
* All subtests have completed.
* Either `addExpected` was never called, or all expected tests have 
been declared.

## Philosophy

Simple-Test-Framework was designed with a "Keep It Simple" philosophy.
The specifics of that philosophy include the following ideals:

* Write Lightweight Code: The less code I write in my test framework, 
the less potential side effects it can have on your test. 
* Avoid Dependencies: The less I depend on other modules, the less I 
have to worry about those modules breaking and thus breaking this. 
* Minimize the API: Too many functions to use makes it more difficult 
to learn, more difficult to write tests, and less likely you will write 
good tests.
* Keep Out Feature-creep: The more stuff I put in here that isn't
needed for testing, the more complex the code, and the more potential 
side effects it can have on your test. I almost didn't write the code 
that wrote the results out to stream because of this.
* Don't Skimp On Goal-Oriented Features: Just because it's a feature
doesn't mean it's a creep. I can't really use the library for what
it's designed for without the feature, then I probably do want it. 
This is why I did end up adding code to write out the results.

## License

```
The MIT License (MIT)

Copyright (c) 2013 Neil M. Sheldon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
