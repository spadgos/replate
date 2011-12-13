# Replate: The Recycling Template Engine #

> This project is still in proof-of-concept stage.

Replate is a templating engine which is designed for use with templates which you need to reuse or redraw often. It is designed around the core idea that the DOM should be modified **as little as possible**.

Consider a template like this:

```html
<div class="stats">
  <dl>
    <dt>Active users:</dt>
    <dd class="stat">${count}</dd>
  </dl>
</div>
```

In that tiny snippet, there are 4 elements, 7 text nodes and 2 attributes. In a regular system, updating the template would re-render the entire block into a string, and then the browser would need to parse it into a *new* DOM fragment to *replace* the existing sub-tree. Replate, on the other hand, would only touch one node: just the text node which contains the count. This also means that if you had attached event handlers or other data onto the DOM nodes, *those properties will remain untouched* and you won't need to rebind your events.

## Todo ##

Currently, just about everything.
