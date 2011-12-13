/*jslint eqnull: true */
(function (global, undef) {
  var parseText,
      buildReplacements,
      Sub,
      Replate,
      each,
      updateNode,
      select,
      isEmpty,
      NodeType;

  NodeType = {
    ELEMENT_NODE               : 1,
    ATTRIBUTE_NODE             : 2,
    TEXT_NODE                  : 3,
    DATA_SECTION_NODE          : 4,
    ENTITY_REFERENCE_NODE      : 5,
    ENTITY_NODE                : 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE               : 8,
    DOCUMENT_NODE              : 9,
    DOCUMENT_TYPE_NODE         : 10,
    DOCUMENT_FRAGMENT_NODE     : 11,
    NOTATION_NODE              : 12
  };

  /**
   * Scan a node (and its descendants) for substitution strings in their text or attributes.
   * @param  {Object} replacements The replacements tree. This will be modified by the funtion
   * @param  {Number} index        The positional index of this element in its parent
   * @param  {Node}   el           The Node itself.
   */
  buildReplacements = function(replacements, index, el) {
    var textParts;

    if (el.nodeType === NodeType.ELEMENT_NODE) {
      replacements[index] = {};
      // check attributes
      each(el.attributes, function(attrInd, attr) {
        var textParts = this.parseText(attr.value);
        if (textParts.length > 1) {
          replacements[index][attr.name] = textParts;
        }
      }.bind(this));

      // check children
      each(el.childNodes, buildReplacements.bind(this, replacements[index]));

      // if nothing in here is dynamic, remove the replacements altogether.
      if (isEmpty(replacements[index])) {
        delete replacements[index];
      }
    } else if (el.nodeType === NodeType.TEXT_NODE) {
      textParts = this.parseText(el.nodeValue);
      if (textParts.length > 1) {
        replacements[index] = {
          textContent: textParts
        };
      }
    }
  };
  /**
   * Update a node (and all its descendants) with the given replacement tree (as generated by `buildReplacements`).
   *
   * @param  {Node} el             A node to update
   * @param  {Object} replacements A replacement tree
   * @param  {Object} data         The data to substitute into the replate
   */
  updateNode = function (el, replacements, data) {
    var i, childOffset;
    if (el.nodeType === NodeType.TEXT_NODE) {
      el.nodeValue = Sub.stitch(replacements.textContent, data);
    } else {
      for (i in replacements) {
        if (replacements.hasOwnProperty(i)) {
          childOffset = parseInt(i, 10);
          if (!isNaN(childOffset)) {
            updateNode(el.childNodes[childOffset], replacements[i], data);
          } else {
            el.setAttribute(i, Sub.stitch(replacements[i], data));
          }
        }
      }
    }
  };

  /**
   * Loop over an array
   * @param  {Array}   list
   * @param  {Function} fn
   */
  each = function(list, fn) {
    var i, l;
    for (i = 0, l = list.length; i < l; ++i) {
      fn(i, list[i], list);
    }
  };

  /**
   * Check is an object is empty
   * @param  {Object}   obj
   * @return {Boolean}  True if the object has no properties of its own
   */
  isEmpty = function(obj) {
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Select a value from a (possibly) nested object using a dotted-string notation.
   * @param  {Object} obj  The object to select from
   * @param  {String} path The path to the desired value
   * @return {*}           The corresponding value in the object, or undefined if not found.
   */
  select = function(obj, path) {
    var parts = path.split('.'),
        i, l;
    for (i = 0, l = parts.length; i < l; ++i) {
      if (obj != null) {
        obj = obj[parts[i]];
      } else {
        return undef;
      }
    }
    return obj;
  };

  /**
   * Replate class constructor
   * @param {String} source The source HTML for this Replate template. It must represent a *complete and valid* HTML
   *                        snippet.
   */
  Replate = function(source) {
    this.source = source;
    this.result = null;
    this.replacements = null;
    this.pattern = Replate.pattern;
  };
  /**
   * A convenience method for the Replate constructor. Useful when you want to chain calls together:
   *
   *     Replate.create("...").render({ ... });
   *
   * @param  {String} source
   * @return {Replate}
   */
  Replate.create = function(source) {
    return new Replate(source);
  };
  Replate.pattern = /\$\{([^:}]+?)(?::([^}]+))?\}/g;

  /**
   * Render this replate.
   * @param  {*}            data        Data to be substituted into the Replate
   * @param  {opt_target=}  opt_target  Optional element to append the result into.
   * @return {Array.<Node>}             An array of nodes (elements, text nodes)
   */
  Replate.prototype.render = function(data, opt_target) {
    this.generate(data); // <-- idempotent
    this.reuse(data);

    if (opt_target) {
      var frag = document.createDocumentFragment();
      each(this.result.childNodes, function (i, el) {
        frag.appendChild(el);
      });
      opt_target.appendChild(frag);
    }
    return this.result.childNodes;
  };

  /**
   * Clone this Replate.
   * @return {Replate}
   */
  Replate.prototype.clone = function() {
    var r = new Replate(this.source);
    r.replacements = this.replacements;
    r.pattern = this.pattern;
    return r;
  };

  /**
   * Parse a text node's value from the source, examining for substitution markers.
   * @param  {String} text
   * @return {Array.<String|Sub>} This will be an array which *always* contains an odd number of members. Substitution
   *                              markers will exist on the odd indices. If this array contains only 1 element, then
   *                              there are no substitutions.
   */
  Replate.prototype.parseText = function(text) {
    var re = this.pattern,
        out = [], matches, lastPos = re.lastIndex;
    while ((matches = re.exec(text))) {
      out.push(
        text.substring(lastPos, matches.index),
        new Sub(matches.slice(1))
      );
      lastPos = re.lastIndex;
    }
    out.push(text.substr(lastPos));
    return out;
  };

  /**
   * Generate the DOM representation of this template, as well as its replacement tree. This function is idempotent.
   */
  Replate.prototype.generate = function() {
    if (!this.result) {
      this.buildDOMTree();
    }
    if (!this.replacements) {
      this.buildReplacementTree();
    }
  };

  /**
   * Build the DOM representation of this template. Populates the `this.result` property with an object which appears to
   * be a Node.
   */
  Replate.prototype.buildDOMTree = function() {
    var base = document.createElement('div');
    base.innerHTML = this.source;
    this.result = {childNodes : [].slice.apply(base.childNodes)};
  };

  /**
   * Build the replacement tree. Populates the `this.replacements` object.
   */
  Replate.prototype.buildReplacementTree = function() {
    this.replacements = {};
    each(this.result.childNodes, buildReplacements.bind(this, this.replacements));
  };

  /**
   * Update this replate's DOM nodes using new data, but the same structure.
   * @param  {Object} data
   */
  Replate.prototype.reuse = function(data) {
    updateNode.call(this, this.result, this.replacements, data);
  };

  /**
   * Class for storing and resolving substitutions.
   * @param {Array.<String>} match The result from applying the regex to a text node.
   */
  Sub = function (match) {
    this.varName = match[0];
    this.filter = match[1];
    this.filterArgs = match.slice(2);
  };

  /**
   * Stitch together an array of strings and Subs.
   * @param  {Array.<String|Sub>} textParts
   * @param  {Object}             data      The data to use in each substitution
   * @return {String}
   */
  Sub.stitch = function(textParts, data) {
    var i, l, sub, out = [];
    for (i = 0, l = textParts.length; i < l; ++i) {
      sub = textParts[i];
      if (typeof sub === 'string') {
        out.push(sub);
      } else {
        out.push(sub.render(data));
      }
    }
    return out.join('');
  };

  /**
   * Resolve this substitution using the given data.
   * @param  {Object} data
   * @return {String}
   */
  Sub.prototype.render = function(data) {
    var val = select(data, this.varName);
    if (val == null) {
      return '';
    } else if (this.filter && this.filters[this.filter]) {
      return this.filters[this.filter].apply(this, [val].concat(this.filterArgs));
    } else {
      return val;
    }
  };

  // The filters which can be called on variable substitutions
  Sub.prototype.filters = {
    /** Convert a value to lower case */
    lower: function (val) {
      return String(val).toLowerCase();
    },
    /** Convert a value to UPPER CASE */
    upper: function (val) {
      return String(val).toUpperCase();
    },
    /** Convert a value to Title Case */
    title: function (val) {
      val = String(val).toLowerCase();
      return val.replace(/(^|\s)(\w)/g, function (_, space, letter) {
        return space + letter.toUpperCase();
      });
    }
    // TODO: raw mode
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = Replate;
  } else {
    global.Replate = Replate;
  }
}(this));
