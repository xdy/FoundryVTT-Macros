/*This version of the Magic Missile Macro Automatically expends slots(prepared), spell uses(spontaneous), charges(wands), and consumes scrolls.
Do not make spellcasting entries for your wands or scrolls. If you would like to use that method, please use the original macro.
For staves please use a spellcasting entry due to the nature of how staves work.*/

const mani = ["wand-of-manifold-missiles-1st-level-spell","wand-of-manifold-missiles-3rd-level-spell","wand-of-manifold-missiles-5th-level-spell","wand-of-manifold-missiles-7th-level-spell"]
if (!token.actor.itemTypes.spell.some(s => s.slug === 'magic-missile') && token.actor.itemTypes.consumable.some(s => s.slug.search('magic-missile') === -1) && !token.actor.itemTypes.equipment.some(s => mani.includes(s.slug))) { return ui.notifications.error('You do not have Magic Missile') }if (game.user.targets.ids === undefined || game.user.targets.ids.length === 0) { return ui.notifications.error('At least 1 target is required'); }

const mmE = token.actor.itemTypes.spellcastingEntry.filter(m => m.spells.some(x => x.slug === 'magic-missile') === true);

const mmIds = [];
token.actor.itemTypes.spell.forEach(id => {
	if(id.slug === 'magic-missile') { mmIds.push(id.id); }
});

const mm = [];
const formula =  `{1d4 + 1}[force]`;

mmE.forEach(e => {
	if (e.isPrepared && !e.isFlexible) {
		Object.entries(e.data.data.slots).forEach(sl => {
			let lv = parseInt(sl[0].substr(4));
			Object.entries(sl[1].prepared).forEach(p => {
				if(mmIds.includes(p[1].id) && !p[1].expended) {
					mm.push({name: `Magic Missile lv${lv} (${e.name})`, level: lv, prepared: true, slot: sl[0], prepkey: p[0], entryId: e.id, wand: false, scroll: false, spont: false })
				}
			})
		});
	}
	else {
		const spellData = e.getSpellData();
		spellData.levels.forEach(sp => {
			if(sp.isCantrip || sp.uses.value === 0 || sp.uses.max === 0 ) { return; }
			sp.active.forEach(spa => {
				if(spa.chatData.slug === 'magic-missile'){ mm.push({name: `Magic Missile lv${sp.level} (${e.name})`, level: sp.level, prepared: false, entryId: e.id, wand: false, scroll: false, spont: true })}
			})
		});
	}
});

token.actor.itemTypes.consumable.forEach(s => {
	if (!s.data.data.traits.value.includes("wand") && !s.data.data.traits.value.includes("scroll")) { return; }
	if (s.data.data.spell.data.data.slug === 'magic-missile') { 
		if (s.data.data.traits.value.includes("wand") && s.data.data.charges.value > 0) {
			mm.push({name: `${s.name}`, level: parseInt(s.slug.substr(11,1)), prepared: false, entryId: s.id , wand: true, scroll: false, spont: false,  }) 
		}
		if (s.data.data.traits.value.includes("scroll")) {
			mm.push({name: `${s.name}`, level: s.data.data.spell.heightenedLevel, prepared: false, entryId: s.id, wand: false, scroll: true, spont: false })
		}
	}
});
token.actor.itemTypes.equipment.forEach(s => {
	if (mani.includes(s.slug)) { 
		mm.push({name: `${s.name}`, level: parseInt(s.slug.substr(26,1)), prepared: false, entryId: s.slug, wand: true, scroll: false, spont: false}); 
	}
});

if (token.actor.itemTypes.effect.some(e => e.slug === "maniEF")) {
	const effect = token.actor.itemTypes.effect.find(e => e.slug === "maniEF");
	mm.push({name: `${effect.name}`, level: effect.data.data.level.value, prepared: false, entryId: null, wand: false, scroll: false, spont: false });
}

const mmdd = [{label: 'Which spell?', type: 'select', options: mm.map(n => n.name)},
	      {label: 'Number of Actions?', type: 'select', options: [3,2,1]}
	     ];

if (token.actor.itemTypes.effect.some(e => e.slug === "maniEF")) { mmdd.push({label: `Remove Effect Instead?`, type: "checkbox"})}

const mmdiag = await quickDialog({data : mmdd, title : `Magic Missile`});

if (mmdiag[2] === true) { 
	const effect = token.actor.itemTypes.effect.find(e => e.slug === "maniEF")
	await effect.delete();
	return;
}

const mmch = mm.find(n => n.name === mmdiag[0]);

if(mmch.entryId === null) { mmdiag[1] = 1 }

const multi = parseInt(mmdiag[1]) * Math.floor((1 + mmch.level)/2);

const targetIds = game.user.targets.ids;
const targets = canvas.tokens.placeables.filter(t => targetIds.includes(t.id));

const tdata = [];
targets.forEach(t => {
	if(t.actor.hasPlayerOwner) { ui.notifications.info(`${t.name} is most likely an ally`);}
	tdata.push({label: t.name, type: 'number', options: [1]});
});

const tdiag = await quickDialog({data : tdata, title : `Distribute ${multi} Missiles`});

let tot = 0;
let i;
const fmm = [];
tdiag.forEach(m => {
	tot = tot + m
	if( i !== undefined) { i++ }
	if( i === undefined) { i = 0}
	fmm.push({name: targets[i].name, num: m})
});

if (tot > multi) { return ui.notifications.warn(`You have entered ${tot - multi} too many missiles. Please try again`)}
if (tot < multi) { return ui.notifications.warn(`You have entered ${ multi - tot} too few missiles. Please try again`)}

fmm.forEach(a => {
        if(a.num === 0 || a.num === undefined) { return; }
	let dam = token.actor.itemTypes.feat.some(ds => ds.slug === 'dangerous-sorcery') ? formula.repeat(a.num).replace(/]{/g,'] + {') + ` + {${mmch.level}}[status,force]` : formula.repeat(a.num).replace(/]{/g,'] + {');
	var droll = new Roll(dam);
        droll.toMessage({ flavor: `<strong>${a.num} Magic Missile(s) targeting ${a.name}</strong><br><a class="entity-link" data-pack="pf2e.spells-srd" data-id="gKKqvLohtrSJj3BM"><strong>Magic Missile</strong></a>`, speaker: ChatMessage.getSpeaker() });
});

const s_entry = mmE.find(e => e.id === mmch.entryId);

/* Expend slots */
/* Spontaneous, Innate, and Flexible */
if (mmch.spont) {
	let data = duplicate(s_entry.data);
        Object.entries(data.data.slots).forEach(slot => {
            if (parseInt(slot[0].substr(4)) === mmch.level && slot[1].value > 0) { 
              slot[1].value-=1;
              s_entry.update(data);
            }
        })
}
      
/* Prepared */
if (mmch.prepared) { 
	let data = duplicate(s_entry.data);
        Object.entries(data.data.slots).forEach(slot => {
            if (slot[0] === mmch.slot) {
              slot[1].prepared[mmch.prepkey].expended = true;
              s_entry.update(data);
            }
        })
}

/* Wand */
if (mmch.wand) {
	if (mani.includes(mmch.entryId)) {
		if (token.actor.itemTypes.effect.some(e => e.slug === "maniEF")) {
			const effect = token.actor.itemTypes.effect.find(e => e.slug === "maniEF")
			await effect.delete();
		}
		if (!token.actor.itemTypes.effect.some(e => e.slug === "maniEF")){
			const maniEF = {
  				"name": `${mmch.name} Effect`,
  				"type": "effect",
  				"img": "systems/pf2e/icons/equipment/wands/specialty-wands/wand-of-manifold-missiles.webp",
  				"data": {
    					"description": {
      						"value": `<p><strong>Requirements</strong> You used Wand of Manifold Missiles to cast Magic Missile.</p>\n<hr />\n<p>After you cast the spell, an additional missile or missiles are released from the wand at the start of each of your turns, as though you cast the 1-action version of magic missile. Choose targets each time. This lasts for 1 minute, until you are no longer wielding the wand, or until you try to activate the wand again.</p>`
    					},
    					"source": {
						"value": ""
    					},
    					"traits": {
						"value": [],
      						"rarity": {
        					"value": "common"
						},
 						"custom": ""
    					},
					"rules": [],
    					"slug": "maniEF",
    					"schema": {
      						"version": 0.697,
						"lastMigration": null
    					},
    					"level": {
						"value": mmch.level
    					},
    					"duration": {
						"value": -1,
      						"unit": "unlimited",
      						"sustained": false,
      						"expiry": "turn-start"
    					},
    					"start": {
						"value": 0,
      						"initiative": null
    					},
    					"target": null,
    					"tokenIcon": {
						"show": true
					}
  				},
  				"effects": [],
				"sort": 0
			};
			await actor.createEmbeddedDocuments('Item', [maniEF]);
		}
	}
	else {
		const w = token.actor.itemTypes.consumable.find(id => id.id === mmch.entryId);
		const wData = duplicate(w.data)
		wData.data.charges.value --
		w.update(wData);
	}
}

/* Scroll */
if(mmch.scroll){
	const s = token.actor.itemTypes.consumable.find(id => id.id === mmch.entryId);
	await s.delete();
}


/* Dialog box */
async function quickDialog({data, title = `Quick Dialog`} = {}) {
	data = data instanceof Array ? data : [data];

	return await new Promise(async (resolve) => {
	        let content = `
        	<table style="width:100%">
          	${data.map(({type, label, options}, i)=> {
          		if(type.toLowerCase() === `select`)
          	{
          		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select style="font-size:12px" id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
          	}else if(type.toLowerCase() === `checkbox`){
            		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
          	}else{
            		return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" value="${options instanceof Array ? options[0] : options}"/></td></tr>`;
          	}
          	}).join(``)}
        	</table>`;

        await new Dialog({
         title, content,
         buttons : {
           Ok : { label : `Ok`, callback : (html) => {
             resolve(Array(data.length).fill().map((e,i)=>{
               let {type} = data[i];
               if(type.toLowerCase() === `select`)
               {
                 return html.find(`select#${i}qd`).val();
               }else{
                 switch(type.toLowerCase())
                 {
                   case `text` :
                   case `password` :
                   case `radio` :
                   return html.find(`input#${i}qd`)[0].value;
                  case `checkbox` :
                  return html.find(`input#${i}qd`)[0].checked;
                  case `number` :
                  return html.find(`input#${i}qd`)[0].valueAsNumber;
                }
              }
            }));
          }}
        },
        default : 'Ok'
        })._render(true);
        document.getElementById("0qd").focus();
      });
    }