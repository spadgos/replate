(function (global) {
  var NodeType = {
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
  var NodeTypeRev = { // just for development
    1: "ELEMENT_NODE",
    2: "ATTRIBUTE_NODE",
    3: "TEXT_NODE",
    4: "DATA_SECTION_NODE",
    5: "ENTITY_REFERENCE_NODE",
    6: "ENTITY_NODE",
    7: "PROCESSING_INSTRUCTION_NODE",
    8: "COMMENT_NODE",
    9: "DOCUMENT_NODE",
    10: "DOCUMENT_TYPE_NODE",
    11: "DOCUMENT_FRAGMENT_NODE",
    12: "NOTATION_NODE"
  };
  var parseText,
      buildReplacements,
      Sub,
      Replate,
      each,
      updateNode,
      select,
      isEmpty;

  buildReplacements = function(replacements, index, el) {
    switch (el.nodeType) {
    case NodeType.ELEMENT_NODE:
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
      break;
    case NodeType.TEXT_NODE:
      var textParts = this.parseText(el.nodeValue);
      if (textParts.length > 1) {
        replacements[index] = {
          textContent: textParts
        };
      }
      break;
    }
  };
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

  select = function(obj, path) {
    var parts = path.split('.'),
        i, l, undef;
    for (i = 0, l = parts.length; i < l; ++i) {
      if (obj != null) {
        obj = obj[parts[i]];
      } else {
        return undef;
      }
    }
    return obj;
  };

  Replate = function(source) {
    this.source = source;
    this.result = null;
    this.replacements = null;
    this.pattern = Replate.pattern;
  };
  Replate.create = function(source) {
    return new Replate(source);
  };
  Replate.pattern = /\$\{(.*?)\}/g;

  Replate.prototype.render = function(data, target) {
    if (this.result == null) {
      this.generate(data);
    }
    this.reuse(data);

    if (target) {
      var frag = document.createDocumentFragment();
      each(this.result.childNodes, function (i, el) {
        frag.appendChild(el);
      });
      target.appendChild(frag);
    }
    return this.result.childNodes;
  };

  Replate.prototype.parseText = function(text) {
    var re = this.pattern,
        out = [], matches, lastPos = re.lastIndex;
    while ((matches = re.exec(text))) {
      out.push(
        text.substring(lastPos, matches.index),
        new Sub(matches[1])
      );
      lastPos = re.lastIndex;
    }
    out.push(text.substr(lastPos));
    return out;
  };

  Replate.prototype.generate = function() {
    var base = document.createElement('div');
    base.innerHTML = this.source;

    this.result = {childNodes : [].slice.apply(base.childNodes)};
    this.replacements = {};

    each(this.result.childNodes, buildReplacements.bind(this, this.replacements));
  };

  Replate.prototype.reuse = function(data) {
    updateNode.call(this, this.result, this.replacements, data);
  };

  Sub = function (contents) {
    // todo: allow for modifiers (eg: raw text, capitalize, etc)
    this.varName = contents;
  };
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
  Sub.prototype.toString = function() {
    return "((" + this.varName + "))";
  };
  Sub.prototype.render = function(data) {
    return select(data, this.varName);
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = Replate;
  } else {
    global.Replate = Replate;
  }
}(this));
