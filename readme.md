## Simple Test Framework

Another lightweight testing utility for node. 

TODO: Need some way to 'preview' this in HTML.

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
* Checkpoints are like mini-tests that can be simply marked pass/fail.
They are equivalent to the way assertions are handled in other testing 
frameworks.
* Checkpoints can be passed based on a condition, or based on whether
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
   t.test("Your sub-test succeedes",function(t) {
   
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

### stf ```= require('simple-test-framework')```

<a name="stf.test"/>
#### stf.test(name,[options],[body])

* name ```String``` The name for the test, as output to stream.
* options ```Object``` Options for controlling the test and output.
* body ```Function``` Optional body for asynchronous test.

Creates a 'root' test object, writing the results to a stream when that
test is finished. Except for writing to a stream, the behavior is the
same as calling <a href="#Test.prototype.test">test on a Test object.

##### options:

* options.timeout: ```Number``` Specifies the number of milliseconds
after which the Test will time out due to no activity. Defaults to
5000, or 5 seconds.
* options.writer: ```Object``` Specifies a writer to write the results
to when the test is finished. This object must provide the same API as
<a href="#ResultWriter">ResultWriter</a>. If not set, a ResultWriter
will be used. If specifically set to null, then the test results will
not be output.
* options.output: ```Writable Stream``` Specifies the stream to write 
the results of the Test to. This property is ignored if options.writer
is set. If not defined, results will be written to ```process.stdout```.
Although a writeable stream is suggested, all that is really expected is
an object that contains a ```write``` method, that takes a ```String```
argument.

##### body:

* function (Test)

If a test body is passed to the method, that function will be run
asynchronously, with the new Test object being passed to the function.
See <a href="#Test.prototype.test">Test.test</a> for more details.

If a test body is not passed to the function, then the new Test object 
will be returned from the function, to be used synchronously.

#### stf.ResultWriter

See <a href="#ResultWriter">ResultWriter</a>

<a name="Test"/>
### Test

TODO: Fill out the following, don't forget anchors.

#### name ```String```
#### contents ```Array```
#### passed ```Number```
#### failed ```Number```
#### expected ```Number```
#### total ```Number```
#### pending ```Number```
#### errors ```Number```
#### finished ```Boolean```
#### finishReason ```String```
#### timeout ```Number```
#### test(name,[timeout],[body]) [```Test```]
#### check(condition,name) ```Boolean```
#### cleanup(fn)
#### addExpected(count)
#### finish([reason])
#### ping()
#### comment(data)
#### error(data)
#### isPassed() ```Boolean```
#### isCompleted() ```Boolean```

<a name="ResultWriter"/>
### ResultWriter

TODO: Make sure to write this with the understanding that it defines an API.
TODO: Fill out the following, don't forget anchors Note that there may
be additional functions which don't need to be defined according to the
API.


#### writeTest(test,[indent])
#### writeComment(data,[indent])
#### writeError(data,[indent])
#### showProgress(message,[indent])
#### endProgress()



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
needed for a Test Framework, the more complex the code, and the
more potential side effects it can have on your test. I almost 
didn't write the code that wrote the results out to stream.
* Don't Skimp On Goal-Oriented Features: Just because it's a feature
doesn't mean it's a creep. I can't really use the library for what
it's designed for without the feature, then I probably do want it. 
This is why I did end up adding code to write out the results.

## License

MIT

TODO:
