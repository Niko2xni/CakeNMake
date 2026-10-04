# AI borders and cake text

The AI can use set_edge_border to add, replace, remove or recolor top and bottom borders using the same design catalogs as the manual Edge panel. Alternating borders support two colors. Middle and all require two tiers; both targets only the top and bottom, while all includes the middle seam. Side-wall Lambeth remains a separate side treatment.

set_cake_text accepts exact customer wording, piping or buttercream style, and a supported color. Piping creates flat icing text in the existing three-line renderer, supporting Latin letters, numbers and basic punctuation. Buttercream creates movable uppercase/lowercase letter items using the existing A–Z catalogs. The tool wraps words across at most three centered lines and limits text to 60 characters. Long words, unsupported characters and overlaps are rejected before any mutation.

Replacing text removes previous letter items and piping lines while preserving other placed decorations. Empty text clears only lettering. Text has its own color rather than recoloring center decorations. Existing pricing rules count piping characters or buttercream letters and border designs without a separate pricing implementation.

Example requests:

- Add a pink shell border on top and a chocolate bead border at the bottom.
- Add alternating pink and red rope piping around every edge.
- Write Happy Birthday Ana in pink piping.
- Add Mia using white buttercream letters.
- Remove the lettering but keep the toppings.

Restart the backend after deployment so it loads the updated generated tool catalog. Exact placement remains subject to available space; customers can reposition individual letters manually.
