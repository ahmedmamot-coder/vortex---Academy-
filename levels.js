const PROGRAM_DEFAULTS = [
{name:"Bubbly Blowfish",goal:"Build water comfort and independence",next:"Level 2 · Seahorse Splash",
  skills:["Safe entry and exit","Face in water with bubbles","Assisted front and back float","Paddle and kick with noodle","Jump in and return to the wall with help"],
  assess:["Confident face in water with bubbles","Front and back float 5 seconds (with or without help)","Kick across 3m with a noodle or board","Jump in and return to wall unassisted"],short:"Level 1",code:"L1",kicker:"Level",badge:"1",group:"academy",nextId:2},
{name:"Seahorse Splash",goal:"Build independence in movement and floatation",next:"Level 3 · Clappy Crab",
  skills:["Push and glide from wall","Kick holding the edge (straight legs)","Back float 5+ seconds unassisted","Paddle arms with kick (noodle/board)","Unassisted jump and return"],
  assess:["Push and glide 3m with straight body","Kick 5m with board (face in water)","Back float 5+ seconds alone","Paddle 3m with coordination","Confident unassisted jump and swim to wall"],short:"Level 2",code:"L2",kicker:"Level",badge:"2",group:"academy",nextId:3},
{name:"Clappy Crab",goal:"Introduce coordinated stroke movements",next:"Level 4 · Paddle Pufferfish",
  skills:["Superman kicking front (6m)","Blowing bubbles while kicking with board","Bilateral breathing (face in/out with kickboard)","Back kick with straight arms by sides (6m)","Freestyle arms with breathing (one arm bubbles, one breath arm)"],
  assess:["Kick front 6m with board + bubbles","Kick back 6m with arms by sides","Swim freestyle 6m with one arm catch-up & breathing","Show bilateral breathing pattern","Maintain body position throughout"],short:"Level 3",code:"L3",kicker:"Level",badge:"3",group:"academy",nextId:4},
{name:"Paddle Pufferfish",goal:"Build complete stroke structure",next:"Level 5 · Nitro Needlefish",
  skills:["Swim freestyle 12.5m with breathing & coordination","Introduce full backstroke arms (12.5–6m)","Streamline push off wall","Breakout into freestyle or backstroke","Breaststroke kick (with board) introduction"],
  assess:["Swim 12.5m freestyle with proper breathing technique","Swim 12.5m backstroke with arms","Streamline + breakout properly from wall","Breaststroke kick 6m with board","Understand difference between strokes"],short:"Level 4",code:"L4",kicker:"Level",badge:"4",group:"academy",nextId:5},
{name:"Nitro Needlefish",goal:"Full stroke mastery and prep for pre-competitive",next:"Pre-Competitive Squad",
  skills:["Swim 25m freestyle with correct breathing and turns","Swim 25m backstroke with streamline and finish","Full breaststroke (arms + kick + glide) 25–12.5m","Dolphin kick introduction (with board and streamline)","Underwater push-off with dolphin kick and breakout"],
  assess:["Swim 25m freestyle with bilateral breathing and turn","Swim 25m backstroke with streamline and finish","Swim 25–12.5m breaststroke with rhythm and glide","Perform 3 dolphin kicks off wall","Streamline start with underwater phase"],short:"Level 5",code:"L5",kicker:"Level",badge:"5",group:"academy",nextId:0},
 {name:"Baby Bubbles 1",goal:"Happy, safe first experiences in the water with a parent",next:"BB 2 · Baby Bubbles 2",short:"BB 1",code:"BB1",kicker:"Baby Bubbles",badge:"1",group:"bb",nextId:7,
  skills:["Calm entry and secure holds with parent","Supported back float with eye contact","Water poured over the head on a cue (\"ready, go\")","Assisted kicking and splashing","Reaching for toys with support"],
  assess:["Relaxed in the water for the whole session","Accepts water on the face after the cue","Supported back float for 5 seconds, calm","Safe sit-and-slide entry with parent"]},
 {name:"Baby Bubbles 2",goal:"Build confidence and early independence with a parent",next:"BB 3 · Baby Bubbles 3",short:"BB 2",code:"BB2",kicker:"Baby Bubbles",badge:"2",group:"bb",nextId:8,
  skills:["Brief submersion on a cue with parent","Kicking on the front with support","Supported back float with ears in","Monkey-walk along the wall","Turn and return to the wall"],
  assess:["Comfortable submersion on the cue","Kicks on the front with support for 3m","Back float 5 seconds with light support","Holds the wall alone for 5 seconds","Turns and returns to the wall with help"]},
 {name:"Baby Bubbles 3",goal:"Get ready to swim without a parent",next:"Level 1 · Bubbly Blowfish",short:"BB 3",code:"BB3",kicker:"Baby Bubbles",badge:"3",group:"bb",nextId:1,
  skills:["Blowing bubbles on the surface","Front glide to parent or wall","Back float with minimal support","Kicking with a noodle or float","Jump in and turn back to the wall"],
  assess:["Blows bubbles through mouth and nose","Glides 1m to the wall","Back float 5 seconds with fingertip support","Kicks 2m with a noodle","Jumps in and returns to the wall with help"]},
 {name:"Private Training",goal:"Focused coaching on each swimmer's personal goals",next:"Coach to advise the right level or squad",short:"PT",code:"PT",kicker:"Private",badge:"PT",group:"pt",nextId:0,
  skills:["Water confidence and body position","Freestyle technique","Backstroke technique","Breaststroke technique","Starts, turns and finishes"],
  assess:["Holds a streamlined body position","Freestyle with rhythmic breathing","Backstroke with a steady kick","Breaststroke with correct timing","Reached the goal set for this block"]}
 ,{name:"Water Confidence",goal:"Feel safe and relaxed in the water",next:"Level 2 · Float & Glide",short:"Level 1",code:"A1",kicker:"Adult level",badge:"1",group:"adult",nextId:11,max:6,reg:"Level 1",
  skills:["Safe entry, exit and standing up from a float","Breath control – bubbles and face in the water","Front float with support","Back float with support","Walking and moving across the shallow end"],
  assess:["Puts face in and blows bubbles for 5 seconds","Front float 5 seconds and stands up safely","Back float 5 seconds and stands up safely","Moves confidently across the shallow end"]}
 ,{name:"Float & Glide",goal:"Float, glide and kick on your own",next:"Level 3 · Stroke Foundations",short:"Level 2",code:"A2",kicker:"Adult level",badge:"2",group:"adult",nextId:12,max:6,reg:"Level 2",
  skills:["Unassisted front and back float","Push and glide from the wall","Flutter kick with a board","Rolling from front to back","Treading water with support"],
  assess:["Front and back float 10 seconds alone","Push and glide 5m","Kick 10m with a board","Roll front to back and recover"]}
 ,{name:"Stroke Foundations",goal:"Build freestyle and backstroke",next:"Level 4 · Stroke Development",short:"Level 3",code:"A3",kicker:"Adult level",badge:"3",group:"adult",nextId:13,max:6,reg:"Level 3",
  skills:["Freestyle arms with side breathing","Backstroke arms and kick","Streamline push-off","Treading water 30 seconds","Deep-water confidence"],
  assess:["Swim 12.5m freestyle with breathing","Swim 12.5m backstroke","Tread water 30 seconds","Jump into deep water and return to the wall"]}
 ,{name:"Stroke Development",goal:"Swim longer distances with good technique",next:"Level 5 · Fitness Swimmer",short:"Level 4",code:"A4",kicker:"Adult level",badge:"4",group:"adult",nextId:14,max:6,reg:"Level 4",
  skills:["Bilateral breathing in freestyle","Breaststroke kick and timing","Open turns","Swimming 25m continuously","Pacing and breathing rhythm"],
  assess:["Swim 25m freestyle with bilateral breathing","Swim 25m backstroke","Swim 12.5m breaststroke","Open turn and continue swimming"]}
 ,{name:"Fitness Swimmer",goal:"Swim for fitness with confidence in all strokes",next:"Masters squad",short:"Level 5",code:"A5",kicker:"Adult level",badge:"5",group:"adult",nextId:null,max:8,reg:"Level 5",
  skills:["Full breaststroke","Butterfly kick and arms introduction","Flip turn introduction","Interval sets with the pace clock","Swimming 100m continuously"],
  assess:["Swim 100m continuously","Swim 25m breaststroke","Swim 25m in two different strokes with good technique","Complete a short interval set"]}
 ,{name:"Private Training",goal:"One-to-one coaching on personal goals",next:"Coach to advise the right level",short:"PT",code:"PT",kicker:"Private",badge:"PT",group:"apt",nextId:null,pt:true,max:1,reg:"PT",
  skills:["Water confidence and body position","Freestyle technique","Backstroke technique","Breaststroke technique","Endurance and pacing"],
  assess:["Holds a streamlined body position","Freestyle with rhythmic breathing","Backstroke with a steady kick","Breaststroke with correct timing","Reached the goal set for this block"]}
 ,{name:"Group Private",goal:"Small-group coaching on shared goals",next:"Coach to advise the right level",short:"GRP PT",code:"GPT",kicker:"Group private",badge:"G",group:"apt",nextId:null,max:4,reg:"GRP PT",
  skills:["Water confidence and body position","Freestyle technique","Backstroke technique","Breaststroke technique","Endurance and pacing"],
  assess:["Holds a streamlined body position","Freestyle with rhythmic breathing","Backstroke with a steady kick","Breaststroke with correct timing","Reached the goal set for this block"]}
 ,{name:"Aqua Aerobics",goal:"Low-impact fitness, strength and mobility in the water",next:"Keep training – progress to higher intensity",short:"Aqua",code:"AQ",kicker:"Aqua aerobics",badge:"AQ",group:"aqua",nextId:null,max:0,reg:"AQUA",
  skills:["Water walking and jogging","Cardio intervals (jumping jacks, cross-country)","Upper-body resistance with gloves or dumbbells","Core and balance work","Stretch and cool-down"],
  assess:["Keeps up with the full class tempo","Uses correct posture in the water","Completes the cardio intervals","Good range of movement in stretches"]}
 ,{name:"Aqua Private",goal:"One-to-one aqua fitness session",next:"Join the Aqua Aerobics class",short:"Aqua PT",code:"AQPT",kicker:"Aqua private",badge:"AQ",group:"aqua",nextId:null,pt:true,max:1,reg:"AQUA PT",
  skills:["Water walking and jogging","Cardio intervals","Resistance work","Core and balance","Mobility and stretching"],
  assess:["Keeps up with the session tempo","Correct posture in the water","Completes the cardio intervals","Good range of movement"]}
];
let LEVELS = PROGRAM_DEFAULTS.map(p => ({ ...p }));
function applyPrograms(o){ LEVELS = PROGRAM_DEFAULTS.map((p, i) => { const x = (o || {})[String(i + 1)] || {}; const m = { ...p };
  ["name","goal","next"].forEach(k => { if (typeof x[k] === "string" && x[k].trim()) m[k] = x[k].trim(); });
  ["skills","assess"].forEach(k => { if (Array.isArray(x[k]) && x[k].filter(Boolean).length) m[k] = x[k].filter(Boolean).slice(0, 5); }); return m; }); }
const GROUPS = [{ id:"academy", name:"Academy levels" }, { id:"bb", name:"Baby Bubbles" }, { id:"pt", name:"Private training" },
  { id:"aqua", name:"Aqua aerobics" }, { id:"adult", name:"Swim levels" }, { id:"apt", name:"Private training" }];
/* Programs: each one has its own swimmers, levels and coaches */
const PROGS = {
  kids:   { id:"kids",   name:"Kids Academy",        short:"Kids",   sub:"Learn to swim · Baby Bubbles · Private training", groups:["academy","bb","pt"], color:"#1B22E4", sex:"" },
  ladies: { id:"ladies", name:"Ladies Program",      short:"Ladies", sub:"Aqua aerobics · Swim levels · Private training",  groups:["aqua","adult","apt"], color:"#8F23D7", sex:"F" },
  men:    { id:"men",    name:"Men's Adult Program", short:"Men",    sub:"Swim levels · Private & group training",         groups:["adult","apt"], color:"#067EEA", sex:"M" }
};
let CUR_PROG = "kids";
const progLevels = (p) => { const g = PROGS[p || CUR_PROG].groups; return g.flatMap(id => LEVELS.map((L, i) => L.group === id ? i + 1 : 0).filter(Boolean)); };
const progGroups = (p) => PROGS[p || CUR_PROG].groups.map(id => GROUPS.find(g => g.id === id));
const lvMax = n => { const L = LEVELS[n - 1] || {}; return L.max === 0 ? Infinity : L.max || (n === 5 ? 8 : 4); };
const lvPT = n => n === 9 || !!(LEVELS[n - 1] || {}).pt;
const TRAITS=["Effort in session","Listening & focus","Confidence in water","Teamwork & respect"];
