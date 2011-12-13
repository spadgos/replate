/*globals Tyrtle */

var testSuite = new Tyrtle();

Tyrtle.addAssertions({
  /**
   * Assert that a replate result matches some html
   * @param  {Array.<Node>} subject  The result of Replate.render
   * @param  {String} expected The HTML string which it should match
   */
  'html' : function (subject, expected) {
    var div = document.createElement('div'),
        i, l;
    for (i = 0, l = subject.length; i < l; ++i) {
      div.appendChild(subject[i]);
    }
    return div.innerHTML === expected || [
      "Expected actual HTML doesn't match expected. Actual: {2} Expected: {1}",
      div.innerHTML
    ];
  }
});

testSuite.module("Variable substitution", function () {
  this.test("Basic variable", function (assert) {
    var source = "<div>${foo}</div>",
        r = new Replate(source),
        data = {
          foo: 'FOO'
        },
        result = r.render(data);

    assert.that(result).is.ofType('array').since('replate should always return an array of elements');
    assert.that(result).is.html("<div>FOO</div>")();
  });

  this.test("Multiple variables", function (assert) {
    var data, result;
    data = {
      foo: 'FOO',
      bar: 'BAR',
      baz: 'BAZ'
    };
    result = (new Replate("1: ${foo}<em>2: ${bar}</em>3: ${baz}")).render(data);
    assert.that(result).is.html("1: FOO<em>2: BAR</em>3: BAZ")();
  });

  this.test("Nested variables", function (assert) {
    var data, result;
    data = {
      foo : {
        bar : {
          baz : 'hello'
        }
      }
    };
    result = (new Replate('${foo} ${foo.bar} ${foo.bar.baz} ${foo.bar.baz.quux}')).render(data);
    assert.that(result).is.html('[object Object] [object Object] hello ')();
  });

  this.test("Variable substitution in attributes", function (assert) {
    var data, result;
    data = {foo : 'FOO'};
    result = Replate.create('<div class="${foo}">${foo}</div>').render(data);
    assert.that(result).is.html('<div class="FOO">FOO</div>')();
  });
});
testSuite.module("Result reuse", function () {
  this.test("A result is reused", function (assert) {
    var result, rerenderResult, replate;
    replate = Replate.create('<div class="${foo}"><em>${foo}</em></div>');
    result = replate.render({foo : 'FOO'});
    rerenderResult = replate.render({foo : 'BAR'});
    assert.that(result).is(rerenderResult)("The return values are the exact same arrays");
    assert.that(result[0]).is(rerenderResult[0])("The exact same DOM element should be returned");
  });
});
testSuite.run();
