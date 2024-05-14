// Search for and toggle presets on all selected placeables

function togglePresetOnSelected(presetName) {
    const controlled = [...canvas.templates.controlled, ...canvas.tokens.controlled, ...canvas.drawings.controlled];
    for(const placeable of controlled) {
      if(TokenMagic.hasFilterId(placeable, presetName)) {
        TokenMagic.deleteFilters(placeable, presetName);
      } else {
        const preset = TokenMagic.getPreset(presetName);
        if(preset) {
          TokenMagic.addUpdateFilters(placeable, preset);
        }
      }
    }
}

let content = `<input type="text" class="search" placeholder="Search for presets.."><a class="delete"><img src="modules/tokenmagic/gui/macros/images/00%20-%20A%20-%20Delete%20filters%20on%20Selected.webp"></img></a>`;

let list = '<ul class="preset-list">'
TokenMagic.getPresets().forEach(p => list += `<li title="Click to toggle on selected."><a class="preset">${p.name}</a></li>`)
list += '</ul>';

content += list;
   
let styles = `
<style>
.search {
    width: 90% !important;
    font-size: 16px !important;
    padding: 12px 0px 12px 20px !important;
    border: 1px solid #ddd !important;
    margin-bottom: 12px !important;
}

.delete img {
    height: 2em;
    margin-left: 5px;
    position: absolute;
}

.preset-list {
  /* Remove default list styling */
  list-style-type: none;
  padding: 0;
  margin-top: 0;
  height: 400px;
  overflow: auto;
}

.preset-list li a {
    border: 1px solid #ddd;
    margin-top: -1px;
    background-color: black;
    padding: 12px;
    text-decoration: none;
    font-size: 18px;
    color: white;
    display: block;
}

.preset-list li a:hover:not(.header) {
  background-color: brown; /* Add a hover effect to all links, except for headers */
}
</style>
`;

content = styles + content;
   
    new Dialog({
        title: `TMFX GUI - Toggle Presets`,
        content,
        render: (html) => {
            // Filtering
            html.find('.search').on('input', () => {
              const filter = html.find('.search').val().trim().toLowerCase()
              html.find('.preset-list li').each(function () {
                  const li = $(this);
                  if(li.find('a').text().toLowerCase().includes(filter)) {
                      li.show();
                  } else {
                      li.hide();
                  }
              });
            });
            // Toggling
            html.find('.preset-list li').on('click', (event) => {
                const presetName = $(event.target).closest('li').find('a').text();
                togglePresetOnSelected(presetName);
            });
            // Deleting
            html.find('.delete').on('click', ()=> {
                TokenMagic.deleteFiltersOnSelected();
            });
        }  ,
        buttons: {
            close: {
                icon: "",
                label: "Close",
                callback: () => {}
            },
        },
        default: "close",
        close: html => {
        }
    }, { id: 'tokenmagic-toggle-preset' }).render(true);