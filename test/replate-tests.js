/*globals Tyrtle */
(function () {
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

  testSuite.module("Filters", function () {
    var renderBasic = function(filterName, val) {
      return Replate.create('${foo' + (filterName ? ":" + filterName : "") + '}').render({foo : val});
    };

    this.test("Default: HTML escaping", function (assert) {
      assert.that(renderBasic('', '<foo> & \' "')).is.html('&lt;foo&gt; &amp; \' "')();
    });
    this.test("Default: HTML escaping inside attributes", function (assert) {
      var result = Replate.create('<div class="${foo}"></div>').render({foo: '<bar> & \' "'});
      assert.that(result).is.html('<div class="&lt;bar&gt; &amp; \' &quot;"></div>')();
    });
    this.test("Upper case", function (assert) {
      assert.that(renderBasic('upper', 'foo bAr')).is.html('FOO BAR')();
    });
    this.test("Lower case", function (assert) {
      assert.that(renderBasic('lower', 'FOo bAr')).is.html('foo bar')();
    });
    this.test("Raw", function (asserT) {
      assert.that(renderBasic('raw', '<em>blah</em>')).is.html("<em>blah</em>")();
    });
  });

  testSuite.run();
}());
