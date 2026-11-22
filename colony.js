let cvs;
let ctx;

let mouseX;
let mouseY;

let ScrW = 800;
let ScrH = 600;

let loading = 0;
let loaded = 0;
let sprites = {};

function loadSprite(name) {
	if (!sprites[name]) {
		sprites[name] = new Image();
		sprites[name].onload = function() {loaded++;}
		sprites[name].src = `gamesprites/${name}.png`
		loading++;
	}
	return name;
}

let tileData = {}
let tiles = {}
let tilesByType = {}
let gridSize = 80

let scl = 0.5
let shiftX = 400
let shiftY = -340

let hoveredTileX = -1
let hoveredTileY = -1
let selectedTileX = -1
let selectedTileY = -1

function debugBerries(x, y, size = 8) {
	ctx.drawImage(sprites["berries"], x-size/2, y-size/2, size, size);
}

// RENDER coords?
let mapCenterX = 0
let mapCenterY = 0

function getGroundSpriteForTileType(tileType) {
	if (tileType == TILE_SAND || tileType == TILE_CLAY) {
		if (scl < 1) return "tile2_mip1"
		if (scl < 0.5) return "tile2_mip2"
		return "tile2"
	}
	if (tileType > TILE_GRASS) {
		if (scl < 1) return "tile1c_mip1"
		if (scl < 0.5) return "tile1c_mip2"
		return "tile1c"
	}
	if (scl < 1) return "tile1_mip1"
	if (scl < 0.5) return "tile1_mip2"
	return "tile1"
}

// get tile center in screen space from world space tile coords
// FIXME: probly shouldnt have repeated code from TileRender
function getTileCenter(x, y) {
	return {
		x: (x * -32 + y * 32 + 32) * scl + shiftX,
		y: (x * 16 + y * 16 + 15.5) * scl + shiftY
	}
}

// several passes to draw stuff on top
function tileRender(pass = 0) {
	let center = Math.floor(gridSize / 2);
	for (let y = 0; y < gridSize; y++) {
		for (let x = 0; x < gridSize; x++) {
			let tileType = tiles[x][y]
			let tileX = (x * -32 + y * 32) * scl + shiftX
			let tileY = (x * 16 + y * 16) * scl + shiftY
			let tileCenterX = tileX + 32 * scl
			let tileCenterY = tileY + 15.5 * scl
			switch (pass) {

				// first tile render pass: draw floor (grass/sand)
				case 0:
					if (x == center && y == center) {
						mapCenterX = tileCenterX
						mapCenterY = tileCenterY
					}
					if (tileType < TILE_GRASS) continue;
					if (tileX > ScrW) continue;
					if (tileY > ScrH) continue;
					if (tileX < -64 * scl) continue;
					if (tileY < -47 * scl) continue;
					ctx.drawImage(sprites[getGroundSpriteForTileType(tileType)], tileX, tileY, 64 * scl, 47 * scl);
					if (Math.abs(mouseX - tileCenterX) + Math.abs(mouseY - tileCenterY) * (32 / 15.5) < 32 * scl) {
						hoveredTileX = x
						hoveredTileY = y
					}
					break;

				// second tile render pass: draw objects on tiles, as well as colonists standing on said tiles
				case 1:
					if (tileX > ScrW) continue;
					if (tileY - 48 * scl > ScrH) continue;
					if (tileX < -64 * scl) continue;
					if (tileY < -80 * scl) continue;

					if (placingBuildable >= 0 && hoveredTileX == x && hoveredTileY == y) {
						let validTileType = false;
						for (let t of BUILDABLES[placingBuildable].validTiles) {
							if (t == tileType) {
								validTileType = true;
								break;
							}
						}
						if (validTileType) {
							ctx.globalAlpha = 0.5
							ctx.drawImage(sprites["tileselect"], tileX, tileY, 64 * scl, 32 * scl);
							ctx.globalAlpha = 0.6 + 0.1 * Math.sin(curTime() * 6);
							ctx.drawImage(sprites[BUILDABLES[placingBuildable].sprite], tileX, tileY - 48 * scl, 64 * scl, 80 * scl);
						} else {
							ctx.globalAlpha = 0.5
							ctx.drawImage(sprites["tileselect2"], tileX, tileY, 64 * scl, 32 * scl);
						}
						ctx.globalAlpha = 1;
					}

					// draw colonist on this tile
					let colonists = guyTiles[x][y];
					for (let i in colonists) {
						let guy = colonists[i];
						if (guy) {
							let drawPos = getTileCenter(guy.x, guy.y);
							let yOffset = (40 + Math.abs(Math.sin(guy.walkCycle) * 6));
							ctx.drawImage(sprites["colonist" + guy.type], drawPos.x - 20 * scl, drawPos.y - yOffset * scl, 40 * scl, 40 * scl);
							if (guy.targetItem >= 0) {
								//if (!guy.work) {
									ctx.globalAlpha = 0.5
									ctx.drawImage(sprites["colonist_think"], drawPos.x - 16 * scl, drawPos.y - (yOffset + 28) * scl, 32 * scl, 32 * scl);
									ctx.globalAlpha = 1
								//}
								ctx.drawImage(sprites[ITEMS[guy.targetItem].sprite], drawPos.x - 8 * scl, drawPos.y - (yOffset + 20) * scl, 16 * scl, 16 * scl);
							}
							// DEBUG INVENTORY VIEW
							/*
							let inv = [];
							for (let [k, v] of Object.entries(guy.inventory)) {
								if (v > 0) {
									for (let i = 0; i < v; i++) {
										inv.push(k)
									}
								}
							}
							if (guy.shouldReturnToStockpile()) {
								inv.push(15); // debug add Gold if theyre going to stockpile
							}
							for (let i in inv) {
								ctx.drawImage(sprites[ITEMS[inv[i]].sprite], drawPos.x + (16 * i - 8) * scl, drawPos.y - (yOffset + 32) * scl, 16 * scl, 16 * scl);
							}
							*/
							if (guy.work) {
								ctx.drawImage(sprites["colonist_workbar" + guy.work], drawPos.x - 15 * scl, drawPos.y - (yOffset + 4) * scl, 30 * scl, 6 * scl);
							}
						}
					}

					if (tileType <= TILE_SAND) continue;

					// draw sprite of object on tile - with mips if there are any
					let tileObj = TILES[tileType];
					if (scl < 1 && tileObj.mip) {
						ctx.drawImage(sprites[tileObj.mipSprites[Math.floor(scl * 2)]], tileX, tileY - 48 * scl, 64 * scl, 80 * scl);
					} else {
						ctx.drawImage(sprites[tileObj.sprite], tileX, tileY - 48 * scl, 64 * scl, 80 * scl);
					}
					break;
			}
		}
	}
}

function randomRange(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const JOB_GATHER = 0;
const JOB_CRAFT = 1;
const JOB_LUMBER = 2;
const JOB_MINE = 3;
const JOB_SMITH = 4;
const JOB_SENTRY = 5;
const JOB_TRADE = 6;

// TODO: bruh
const INVENTORY_SIZE_BY_JOB = [3, 7, 3, 3, 7];

const GUY_SPEED = 0.04;

// this array gets emptied at the start of global draw().
// colonist draw() gets called first, and doesn't actually draw:
// it just adds the colonists to this array indexed by tile coordinates
// of which tile object to draw the colonist with, for z-sorting
var guyTiles = [];

function getTotalReservedStockpile(itemId) {
	let n = 0;
	for (let col of colonists) {
		n += col.reservedStockpile[itemId];
	}
	return n;
}

function getStockpileMinusReserved(itemId) {
	return stockpile[itemId] - getTotalReservedStockpile(itemId);
}


function getStockpileIncludingHeld(itemId) {
	let held = 0;
	for (let col of colonists) {
		held += col.inventory[itemId];
	}
	return stockpile[itemId] + held;
}

class Colonist {
	type;
	x;
	y;

	nextThink = 0;
	walkCycle = 0;
	workCycle = 0;

	tool = -1;
	numInventory = 0;
	inventory = {};
	reservedStockpile = {};
	work = 0;

	targetItem = -1;
	targetTileType = -1;
	targetProduction = -1; // index of the production method in ITEMS[itemId].production array
	targetX = -1;
	targetY = -1;

	constructor(jobType) {
		this.type = jobType;
		this.x = Math.floor(gridSize / 2);
		this.y = this.x;
		for (let i = 0; i < ITEMS.length; i++) {
			this.inventory[i] = 0;
			this.reservedStockpile[i] = 0;
		}
		colonists.push(this);
	}

	// returns all items this job could possibly make
	// without consideration of available tools or materials
	getJobProducts() {
		let products = [];
		for (let workTile of workTiles[this.type]) {
			for (let production of TILES[workTile].production) {
				products.push(production.item);
			}
		}
		return products;
	}

	// returns all items this job could possibly make
	// sorted high priority to low based on quotas
	getJobProductsSorted() {
		let quotaRatios = [];
		for (let itemId of this.getJobProducts()) {
			if (stockpile[itemId] < stockpileQuota[itemId]) {
				quotaRatios.push({
					item: itemId,
					ratio: (stockpile[itemId] + this.inventory[itemId]) / stockpileQuota[itemId]
				})
			}
		}
		/*
		let quotaRatios = this.getJobProducts().map((itemId) => ({
			item: itemId,
			ratio: stockpileQuota[itemId] < 1 ? 999 : getStockpileIncludingHeld(itemId) / stockpileQuota[itemId]
		}));
		*/
		quotaRatios.sort((a, b) => a.ratio - b.ratio);
		return quotaRatios.map((x) => x.item);
	}

	// checks if the conditions in the world permit making this item
	// is the right tile available? do we have tools? do we have the ingredients?
	// if we can make the item, tell us what index in the production array we should use to make it
	// returns -1 if we can't currently make this item
	findProductionMethod(itemId) {
		for (let i in ITEMS[itemId].production) {
			let production = ITEMS[itemId].production[i];

			// if this production method's tile isnt available, skip
			if (!this.findNearbyTile(production.tile)) {
				continue;
			}

			// if our job can't use this production methods tile, skip
			if (!workTiles[this.type].includes(production.tile)) {
				continue;
			}

			// if we don't have ingredients for this method, skip
			if (production.recipe) {
				let hasIngredients = true;
				for (let ing of production.recipe) {
					if (stockpile[ing.item] + this.inventory[ing.item] < ing.amt) {
						hasIngredients = false;
						break;
					}
				}
				if (!hasIngredients) {
					continue;
				}
			}

			// if we don't have the tool for this method, skip
			if (production.tools) {
				let hasTool = false;
				for (let tool of production.tools) {
					if (getStockpileMinusReserved(tool) > 0) {
						hasTool = true;
						break;
					}
				}
				if (!hasTool) {
					continue;
				}
			}

			// if this method has no issues, we can make this item
			if (production.recipe) {
				// un-reserve whatever we were gonna take from the stockpile (if anyhting)
				for (let i in ITEMS) {
					this.reservedStockpile[i] = 0;
				}
				// reserve what we need now from the stockpile
				for (let ing of production.recipe) {
					this.reservedStockpile[ing.item] = ing.amt;
				}
			}

			// save the target tile and return the production id
			this.targetTileType = production.tile;
			return i;
		}

		// if no methods would work, we can't make this item
		return -1;
	}

	// get the highest priority item thats currently possible to make
	// returns -1 if we can't make anything
	getBestMakeableItem() {
		for (let item of this.getJobProductsSorted()) {
			if (item >= -1 && this.findProductionMethod(item) >= 0) {
				return item;
			}
		}
		return -1;
	}

	distToSqr(x, y) {
		let dX = x - this.x;
		let dY = y - this.y;
		return dX * dX + dY * dY;
	}

	// tries to find the closest available tile of this type
	// returns tile position {x, y} object if found
	// returns false if none exists or is available
	findNearbyTile(tileType) {
		let foundX = -1;
		let foundY = -1;
		let foundDist = 999*999;
		for (let tile of tilesByType[tileType]) {
			let tX = tile.x;
			let tY = tile.y;

			// only one colonist can work a tile at a time
			if (tileData[tX][tY].reservedForColonist && tileData[tX][tY].reservedForColonist != this) {
				continue;
			}

			let dist = this.distToSqr(tX, tY);
			if (dist < foundDist) {
				foundX = tX;
				foundY = tY;
				foundDist = dist;
			}
		}
		if (foundX < 0 && foundY < 0) {
			return false;
		}
		return {x: foundX, y: foundY};
	}

	findTargetTile() {
		let tilePos;
		if (this.shouldReturnToStockpile()) {
			// find nearest chest, and fall back to the flag if there is no chest
			let chestPos = this.findNearbyTile(19);
			let flagPos = this.findNearbyTile(3);
			if (!chestPos || this.distToSqr(flagPos.x, flagPos.y) < this.distToSqr(chestPos.x, chestPos.y)) {
				tilePos = flagPos;
			} else {
				tilePos = chestPos;
			}
		} else {
			tilePos = this.findNearbyTile(this.targetTileType);
		}

		if (!tilePos) {
			return;  // TODO: thought bubble feedback
		}

		if (tilePos.x >= 0 && tilePos.y >= 0) {
			// before changing our target tile, un-reserve our previous target tile
			// so that other colonists can select that tile as their target tile
			if (this.targetX >= 0 && this.targetY >= 0) {
				tileData[this.targetX][this.targetY].reservedForColonist = undefined;
			}

			this.targetX = tilePos.x;
			this.targetY = tilePos.y;

			// chests and the flag (stockpile access) cant be reserved for a single colonist
			if (tiles[tilePos.x][tilePos.y] != 3 && tiles[tilePos.x][tilePos.y] != 19) {
				tileData[tilePos.x][tilePos.y].reservedForColonist = this;
			}
		}
	}

	shouldReturnToStockpile() {
		if (this.targetItem < 0 || this.targetProduction < 0) {
			return true;
		}
		let prod = ITEMS[this.targetItem].production[this.targetProduction];
		if (prod.recipe) {
			for (let recipeItem of prod.recipe) {
				if (this.inventory[recipeItem.item] < recipeItem.amt) {
					return true;
				}
			}
		}
		if (this.numInventory >= INVENTORY_SIZE_BY_JOB[this.type]) {
			return true;
		}
		return false;
	}

	think() {
		if (this.targetItem < 0 || this.findProductionMethod(this.targetItem) < 0) {
			this.targetItem = this.getBestMakeableItem();

			if (this.targetItem < 0 || this.findProductionMethod(this.targetItem) < 0) {
				// TODO: wander AI when no work to do
				this.nextThink = curTime() + randomRange(9, 16) * 0.05;
				return
			}
		}
	
		// findProductionMethod also sets targetTileType
		this.targetProduction = this.targetItem >= 0 ? this.findProductionMethod(this.targetItem) : -1;

		// determine if we should return to the stockpile
		if (this.shouldReturnToStockpile()) {
			let tX = this.targetX;
			let tY = this.targetY;
			// if we're not already pathing to stockpile, start doing that
			if (tX < 0 || tY < 0 || !(tiles[tX][tY] == 19 || tiles[tX][tY] == 3)) {
				this.findTargetTile();
				tX = this.targetX;
				tY = this.targetY;
			}

			// if we've reached the stockpile, do what we came to do
			if (tX >= 0 && tY >= 0 && (tiles[tX][tY] == 19 || tiles[tX][tY] == 3) && this.distToSqr(tX, tY) < 0.22) {
				for (let i in ITEMS) {
					// deposit what we have
					stockpile[i] += this.inventory[i];
					this.numInventory -= this.inventory[i];
					this.inventory[i] = 0;
				}

				// find a new thing to make
				if (this.numInventory < 1) {
					this.targetItem = -1;
				}

				for (let i in ITEMS) {
					// pick up what we need for our new thing
					this.inventory[i] += this.reservedStockpile[i];
					this.numInventory += this.reservedStockpile[i];
					stockpile[i] -= this.reservedStockpile[i];
					this.reservedStockpile[i] = 0;
				}

				this.nextThink = curTime() + randomRange(8, 10) * 0.05;
			}
		} else { // if we don't need to deposit/withdraw items/tools from stockpile then its work time
			if (this.targetItem >= 0) {
				let tX = this.targetX;
				let tY = this.targetY;
				if (tX >= 0 && tY >= 0 && tiles[tX][tY] == this.targetTileType && this.distToSqr(tX, tY) < 0.22) {
					this.work++;
					if (this.work > 20) {
						this.work = 0;
						// TODO: find why this is sometimes still -1 at this point
						if (this.targetProduction >= 0) {
							let prod = ITEMS[this.targetItem].production[this.targetProduction];
							if (prod.recipe) {
								for (let ing of prod.recipe) {
									this.inventory[ing.item] -= ing.amt;
									this.numInventory -= ing.amt;
								}
							}
							this.inventory[this.targetItem] += prod.amt;
							this.numInventory += prod.amt;
						}
						this.nextThink = curTime() + 0.3;
					} else {
						this.nextThink = curTime() + 0.13;
					}
				} else {
					this.work = 0;
					this.findTargetTile();
					this.nextThink = curTime() + randomRange(9, 16) * 0.05;
				}
			}
		}

		//this.targetX = this.x + randomRange(-3, 3);
		//this.targetY = this.y + randomRange(-3, 3);
	}

	draw() {
		if (curTime() > this.nextThink) {
			this.think();
		}

		// move in draw thanks mamdani
		if (this.targetX >= 0 && this.targetY >= 0) {
			let tX = this.targetX - this.x;
			let tY = this.targetY - this.y;
			let sqrM = tX * tX + tY * tY;
			if (sqrM > 0.2) {
				let iM = 1.0 / Math.sqrt(sqrM);
				this.x += tX * iM * GUY_SPEED;
				this.y += tY * iM * GUY_SPEED;
				this.walkCycle += 0.25;
			}
		}

		// dont draw colonist here, just tell us where to draw it
		guyTiles[Math.floor(this.x + 0.5)][Math.floor(this.y + 0.5)].push(this);
	}
}

function drawRotated(spr, rot, x, y, w, h) {
	ctx.save();
	ctx.translate(x, y)
	ctx.rotate(rot);
	ctx.drawImage(spr, -w/2, -h/2, w, h)
	ctx.restore();
}

function curTime() {
	return (Date.now() * 0.001) % 100000;
}

var colonists = [];
var stockpile = {};
var stockpileQuota = {};

const ITEM_NONE = -1;
const ITEM_STICK = 0;
const ITEM_STONE = 1;
const ITEM_BERRIES = 2;
const ITEM_CLAY = 3;
const ITEM_BRICK = 4;

const TILE_WATER = -1;
const TILE_GRASS = 0;
const TILE_SAND = 1;
const TILE_CLAY = 2;
const TILE_FLAG = 3;
const TILE_TREE = 4;
const TILE_SAP = 5;
const TILE_BERRY = 6;
const TILE_ROCKS = 7;
const TILE_BOULDER = 8;
const TILE_ORE_COPPER = 9;
const TILE_ORE_TIN = 10;
const TILE_ORE_IRON = 11;
const TILE_ORE_GOLD = 12;

function generateTile(x, y) {
	let center = gridSize / 2;
	let shoreDist = center * 0.7
	let distOutX = Math.abs(x - center);
	let distOutY = Math.abs(y - center);
	let distOut = Math.sqrt(distOutX * distOutX + distOutY * distOutY) / center;
	tileData[x][y] = {
		//distOut: distOut
	}

	// always put flag in the very middle
	if (x == Math.floor(center) && x == y) {
		return TILE_FLAG;
	}

	if (distOut > 0.89) {
		return TILE_WATER;
	} else if (distOut > 0.8 || Math.random() < (distOut * 10 - 7)) {
		return Math.random() < 0.05 ? TILE_CLAY : TILE_SAND;
	} else if (Math.random() < 0.25 && distOut > 0.15) {
		let genTable = [];
		for (const i in TILES) {
			if (TILES[i].genWeight) {
				for (let j = 0; j < TILES[i].genWeight; j++) {
					genTable.push(i);
				}
			}
		}
		return genTable[Math.floor(Math.random() * genTable.length)];
	}
	return TILE_GRASS;
}

let dragMap = false;
let dragStartX = 0;
let dragStartY = 0;

// ancient stackoverflow shit
window.requestAnimFrame = (function() {
	return	window.requestAnimationFrame		||
			window.webkitRequestAnimationFrame	||
			window.mozRequestAnimationFrame		||
			function(callback) {
				window.setTimeout(callback, 16);
			};
})()

function shadowText(txt, x, y, clr) {
	ctx.globalAlpha = 0.4;
	ctx.fillStyle = "#211C16";
	ctx.fillText(txt, x + 1, y + 2);
	ctx.fillText(txt, x - 1, y + 2);
	ctx.globalAlpha = 1;
	if (!clr) clr = "#FFDBAD";
	ctx.fillStyle = clr;
	ctx.fillText(txt, x, y);
}

var BUILDABLES = [];
var TILES = [];
var ITEMS = [];
var RECIPES = {};

// translate from production tiles to items
var ItemToTile =  {};
var TileToItem = {};

var hoveredButton = -1;
var openMenu = -1;
var subMenu = -1;
var menuScroll = 0;
var placingBuildable = -1;

var MENUS = [{
		title: "Stockpile",
		draw: function() {
			for (let i = menuScroll * 8; i < ITEMS.length; i++) {
				let j = i - (menuScroll * 8);
				let x = 146 + 64 * (j % 8);
				let y = 128 + 64 * Math.floor(j / 8);
				if (stockpile[i] <= 0) {
					ctx.globalAlpha = 0.4;
				}
				ctx.drawImage(sprites[ITEMS[i].sprite], x, y, 64, 64)
				ctx.globalAlpha = 1
				if (mouseX - x <= 64 && mouseX - x >= 0 && mouseY - y <= 64 && mouseY - y >= 0) {
					ctx.font = "16px PixelPurl"; 
					ctx.textAlign = "center";
					ctx.textBaseline = "bottom";
					let name = ITEMS[i].name
					if (name.length > 8) {
						name = name.split(" ")
						for (let h = 0; h < name.length; h++) {
							shadowText(name[h], x + 32, y + 28 + 13 * h);
						}
					} else {
						shadowText(name, x + 32, y + 28);
					}
				}
				if (stockpile[i] > 0 || stockpileQuota[i] > 0) {
					ctx.textAlign = "right";
					ctx.textBaseline = "bottom";
					ctx.font = "24px PixelPurl";
					if (stockpileQuota[i] > 0) {
						shadowText(stockpile[i] + "/" + stockpileQuota[i], x + 60, y + 60, (stockpile[i] < stockpileQuota[i]) ? "#db422e" : "#FFDBAD")
					} else {
						shadowText(stockpile[i], x + 60, y + 60)
					}
				}
			}
		},
		click: function(event) {
			if (mouseX >= 146 && mouseX - 146 <= 512 && mouseY >= 130 && mouseY - 130 <= 320) {
				let x = Math.floor((mouseX - 146) / 64);
				let y = Math.floor((mouseY - 130) / 64);
				let itemId = (y * 8) + x;
				if (itemId < ITEMS.length) {
					subMenu = itemId;
					openMenu = 4;
				}
			}
		}
	}, {
		title: "Construction",
		draw: function() {
			let hovering = false;
			for (let i = 0; i < BUILDABLES.length; i++) {
				let build = BUILDABLES[i]
				let x = 200 + 96 * (i % 5);
				let y = 175 + 64 * Math.floor(i / 5);
				ctx.drawImage(sprites[build.sprite], x - 64, y - 100, 128, 160);
				if (mouseX >= x - 32 && mouseX <= x + 32 && mouseY >= y - 24 && mouseY <= y + 40) {
					ctx.textAlign = "center";
					ctx.textBaseline = "bottom";
					ctx.font = "42px PixelPurl";
					shadowText(build.name, 400, 325)
					ctx.font = "32px PixelPurl"; 
					for (let j in build.desc) {
						shadowText(build.desc[j], 400, 350 + j * 24)
					}
					// draw required items to build hovered object
					for (let i = 0; i < build.placementCost.length; i++) {
						let x = 365 + 64 * (i % 8);
						let y = 370 + 64 * Math.floor(i / 8);
						let itemId = build.placementCost[i].item
						ctx.drawImage(sprites[ITEMS[itemId].sprite], x, y, 64, 64)
						ctx.font = "16px PixelPurl"; 
						ctx.textAlign = "center";
						ctx.textBaseline = "bottom";
						let name = ITEMS[itemId].name
						if (name.length > 8) {
							name = name.split(" ")
							for (let h = 0; h < name.length; h++) {
								shadowText(name[h], x + 32, y + 28 + 13 * h);
							}
						} else {
							shadowText(name, x + 32, y + 28);
						}
						ctx.textAlign = "right";
						ctx.textBaseline = "bottom";
						ctx.font = "24px PixelPurl";
						shadowText(stockpile[itemId] + "/" + build.placementCost[i].amt, x + 60, y + 60, (stockpile[itemId] < build.placementCost[i].amt) ? "#db422e" : "#FFDBAD")
					}
					hovering = true;
				}
			}
			if (!hovering) {
				ctx.textAlign = "center";
				ctx.textBaseline = "bottom";
				ctx.font = "32px PixelPurl"; 
				shadowText("Select a building to construct.", 400, 350);
			}
		},
		click: function() {
			for (let i = 0; i < BUILDABLES.length; i++) {
				let x = 200 + 96 * (i % 5);
				let y = 175 + 64 * Math.floor(i / 5);
				if (mouseX >= x - 32 && mouseX <= x + 32 && mouseY >= y - 24 && mouseY <= y + 40) {
					placingBuildable = i;
					openMenu = -1;
				}
			}
		}
	}, {
		title: "Colonists",
		draw: function() {
			for (let i = 0; i < 5; i++) {
				ctx.drawImage(sprites["colonist" + i], 156 + 92 * i, 150, 120, 120)
			}
		},
		click: function(event) {
			if (mouseY >= 150 && mouseY <= 270) {
				for (let i = 0; i < 5; i++) {
					let x = 156 + 92 * i + 20
					if (mouseX >= x && mouseX <= x + 80) {
						new Colonist(i);
						break;
					}
				}
			}
		}
	}, {
		title: "Unused"
	}, {
		title: function() {
			return ITEMS[subMenu].name + " Production"
		},
		draw: function() {
			let itemSpriteX = 336 + 100;
			ctx.drawImage(sprites[ITEMS[subMenu].sprite], itemSpriteX, 184, 128, 128);
			if (stockpile[subMenu] > 0 || stockpileQuota[subMenu] > 0) {
				ctx.textAlign = "right";
				ctx.textBaseline = "bottom";
				ctx.font = "48px PixelPurl";
				if (stockpileQuota[subMenu] > 0) {
					shadowText(stockpile[subMenu] + "/" + stockpileQuota[subMenu], itemSpriteX + 120, 184 + 120, (stockpile[subMenu] < stockpileQuota[subMenu]) ? "#db422e" : "#FFDBAD")
				} else {
					shadowText(stockpile[subMenu], itemSpriteX + 120, 184 + 120)
				}
			}
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.font = "32px PixelPurl"; 
			shadowText("Colonists will prioritize production", 400, 160);
			shadowText("of this item until this quota is met", 400, 184);

			// draw production of selected item
			let prod = ITEMS[subMenu].production;
			if (prod) {
				// cycle between all possible production methods
				prod = prod[Math.floor(curTime()) % prod.length];

				let prodOffsetX = 60;
				let prodOffsetY = 26;
				if (prod.recipe) {
					prodOffsetY = 0;
				}


				if (prod.tile) {
					ctx.drawImage(sprites[TILES[prod.tile].sprite], 200 + prodOffsetX, 130 + prodOffsetY, 128, 160);
				}

				if (prod.job) {
					ctx.drawImage(sprites["colonist" + prod.job], 160 + prodOffsetX, 190 + prodOffsetY, 80, 80);
				}

				if (prod.tools) {
					ctx.drawImage(sprites[ITEMS[prod.tools[0]].sprite], 200 + prodOffsetX, 180 + prodOffsetY, 64, 64);
				}

				if (prod.recipe) {
					for (let i = 0; i < prod.recipe.length; i++) {
						let x = 173 + 54 * (i % 8);
						if (prod.recipe.length > 2) {
							x -= 28;
						} else if (prod.recipe.length == 1) {
							x += 28;
						}
						let y = 255 + 64 * Math.floor(i / 8);
						let itemId = prod.recipe[i].item;
						ctx.drawImage(sprites[ITEMS[itemId].sprite], x + prodOffsetX, y, 64, 64);
						/*
						ctx.font = "16px PixelPurl"; 
						ctx.textAlign = "center";
						ctx.textBaseline = "bottom";
						let name = ITEMS[itemId].name;
						if (name.length > 8) {
							name = name.split(" ")
							for (let h = 0; h < name.length; h++) {
								shadowText(name[h], x + 32, y + 28 + 13 * h);
							}
						} else {
							shadowText(name, x + 32, y + 28);
						}
						*/
						ctx.textAlign = "right";
						ctx.textBaseline = "bottom";
						ctx.font = "32px PixelPurl";
						shadowText("x" + prod.recipe[i].amt, x + 60 + prodOffsetX, y + 60, "#FFDBAD");
					}
				}
				ctx.globalAlpha = 0.7
				ctx.drawImage(sprites["ui_arrow"], 290 + 82, 220, 64, 64)
				ctx.globalAlpha = 1
			}
/*
			// show the next step in this items pipeline
			let makeStuff = ITEMS[subMenu].makeStuff;
			if (makeStuff) {
				ctx.globalAlpha = 1
				let i = 0;
				let startX = 510
				let startY = 180
				let size = 48
				let rowAmt = 3;
				let itemAmt = 0;
				for (let itemId in makeStuff) {
					itemAmt++;
				}
				if (itemAmt < 7) {
					startY += 12
					if (itemAmt < 5) {
						size = 64
						rowAmt = 2
						if (itemAmt < 3) {
							startY += 24
						}
					}
				}
				for (let itemId in makeStuff) {
					let x = startX + size * (i % rowAmt);
					let y = startY + size * Math.floor(i / rowAmt);
					if (stockpile[itemId] <= 0) {
						ctx.globalAlpha = 0.4;
					}
					ctx.drawImage(sprites[ITEMS[itemId].sprite], x, y, size, size);
					ctx.globalAlpha = 1
					if (stockpile[itemId] > 0 || stockpileQuota[itemId] > 0) {
						ctx.textAlign = "right";
						ctx.textBaseline = "bottom";
						ctx.font = "24px PixelPurl";
						if (stockpileQuota[itemId] > 0) {
							shadowText(stockpile[itemId] + "/" + stockpileQuota[itemId], x + (size - 4), y + (size - 4), (stockpile[itemId] < stockpileQuota[itemId]) ? "#db422e" : "#FFDBAD")
						} else {
							shadowText(stockpile[itemId], x + 60, y + 60)
						}
					}
					i++;
				}
				ctx.globalAlpha = 0.6
				ctx.drawImage(sprites["ui_arrow"], 450, 220, 64, 64)
				ctx.globalAlpha = 1
			}
*/
			// draw quota and quota adjustment UI
			ctx.drawImage(sprites["ui_minus"], 250, 350, 96, 96)
			ctx.drawImage(sprites["ui_plus"], 450, 350, 96, 96)
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.font = "80px PixelPurl"; 
			shadowText(stockpileQuota[subMenu], 404, 438)
			ctx.font = "32px PixelPurl"; 
			shadowText("Hold SHIFT to change by 10", 400, 352)
		},
		click: function(event) {
			if (mouseY >= 350 && mouseY - 350 <= 96) {
				let diff = 0;
				if (mouseX >= 250 && mouseX - 250 <= 96) {
					diff = -1;
				} else if (mouseX >= 450 && mouseX - 450 <= 96) {
					diff = 1;
				}
				if (event.shiftKey) {
					diff *= 10;
				}
				let newQuota = stockpileQuota[subMenu] + diff;
				if (newQuota > 100) {
					diff = 100 - stockpileQuota[subMenu];
				} else if (newQuota < 0) {
					diff = -stockpileQuota[subMenu];
				}
				stockpileQuota[subMenu] += diff;
				if (diff) {
					// TODO: diff changed effects
				}
			}
		},
		parentMenu: 0
	}
];

function draw() {
	ctx.fillStyle = "#1B70D1";
	ctx.fillRect(0, 0, ScrW, ScrH);

	// draw floor
	tileRender(0);

	// reset array of colonists' z-indices
	for (let x = 0; x < gridSize; x++) {
		for (let y = 0; y < gridSize; y++) {
			guyTiles[x][y] = [];
		}
	}

	// write z-indices of all colonists
	for (let i in colonists) {
		colonists[i].draw();
	}

	// draw tile objects and colonists
	tileRender(1);

/*
	if (selectedTileX > -1 && selectedTileY > -1) {
		let txtY = 20
		ctx.fillText(selectedTileX+","+selectedTileY+"="+TILES[tiles[selectedTileX][selectedTileY]].name, 20, txtY);
		for (let prop in tileData[selectedTileX][selectedTileY]) {
			txtY += 30
			ctx.fillText(prop+":"+tileData[selectedTileX][selectedTileY][prop], 20, txtY);
		}
	}
*/
	//drawRotated(sprites["item_berries"], Math.sin(curTime() * 13), ScrW / 2, ScrH / 2, 64, 64)

	if (openMenu >= 0) {
		ctx.drawImage(sprites["ui_bigmenu"], 130, 80, 540, 390);
		ctx.drawImage(sprites["ui_x"], 616, 94, 42, 42);
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.font = "48px PixelPurl"; 
		ctx.fillStyle = "#FFDBAD";
		let title = MENUS[openMenu].title
		if (typeof title == "function") {
			title = title();
		}
		shadowText(title, 400, 135)
		if (MENUS[openMenu].draw) {;
			MENUS[openMenu].draw()
		}
	}

/*
	ctx.drawImage(sprites["ui_bigmenu"], 225, 165, 350, 250);
	ctx.drawImage(sprites["ui_x"], 270, 270, 128, 128);
	ctx.drawImage(sprites["ui_check"], 410, 270, 128, 128);
	ctx.textAlign = "center";
	ctx.font = "48px PixelPurl"; 
	ctx.fillStyle = "#33A5EC";
	ctx.fillStyle = "white";
	ctx.fillText("hewwo :3", 400, 220);
*/

	for (let i = 0; i < 3; i++) {
		ctx.drawImage(sprites["ui_hotbar" + i + (openMenu == i ? "b" : "a")], 250 + 100 * i, 500, 100, 100)
		if (hoveredButton == i) {
			ctx.drawImage(sprites["ui_hotbar_hovered"], 250 + 100 * i, 500, 100, 100)
		}
	}

	if (hoveredButton >= 0 && hoveredButton < 3) {
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.font = "36px PixelPurl"; 
		shadowText(MENUS[hoveredButton].title, 400, 500)
	}

	ctx.drawImage(sprites[document.fullscreenElement ? "ui_fullscreen1" : "ui_fullscreen0"], 800 - 64, 0, 64, 64)
	
}

// FIND BY NAME
function FBN(array, name) {
	for (let i in array) {
		if (array[i].name == name) {
			return i
		}
	}
}

function closeCurrentMenu() {
	if (openMenu >= 0) {
		if (MENUS[openMenu].parentMenu != undefined) {
			openMenu = MENUS[openMenu].parentMenu;
		} else {
			openMenu = -1;
		}
	}
}

var itemRecipes = {};
var workTiles = [];

function addRecipe(tile, item, recipe, tools) {
	tile = FBN(TILES, tile);
	item[0] = FBN(ITEMS, item[0]);
	let prodObj = {tile: tile, item: item[0], amt: item[1]};

	// save which job crafts this
	for (let job in workTiles) {
		for (let workTile of workTiles[job]) {
			if (tile == workTile) {
				prodObj.job = job;
			}
		}
	}

	if (recipe) {
		prodObj.recipe = [];
		for (let ing of recipe) {
			// remap recipe from shorthand to readable object
			ing[0] = FBN(ITEMS, ing[0])
			prodObj.recipe.push({
				item: ing[0],
				amt: ing[1]
			})

			// let production menu know this ingredient can make this
			if (!ITEMS[ing[0]].makeStuff) {
				ITEMS[ing[0]].makeStuff = {};
			}
			ITEMS[ing[0]].makeStuff[item[0]] = true;
		}
	}

	if (tools) {
		for (let i in tools) {
			tools[i] = FBN(ITEMS, tools[i]);

			// let production menu know this tool can make this
			if (!ITEMS[tools[i]].makeStuff) {
				ITEMS[tools[i]].makeStuff = {};
			}
			ITEMS[tools[i]].makeStuff[item[0]] = true;
		}
		prodObj.tools = tools;
	}

	// store production struct in tile and item for quick lookup
	if (!TILES[tile].production) {
		TILES[tile].production = [];
	}
	TILES[tile].production.push(prodObj);
	if (!ITEMS[item[0]].production) {
		ITEMS[item[0]].production = [];
	}
	ITEMS[item[0]].production.push(prodObj);
}

var mouseOffsetX = 0;
var mouseOffsetY = 0;

function parseMouse(event) {
	const rect = cvs.getBoundingClientRect();
	let realW = cvs.offsetWidth;
	let realH = cvs.offsetHeight;
	let scrLeft = rect.left;
	let scrTop = rect.top;

	// maintain canvas aspect ratio
	if (realW / realH > ScrW / ScrH) {
		let newRealW = realH * (ScrW / ScrH);
		scrLeft += (realW - newRealW) / 2;
		realW = newRealW;
	} else if (realW / realH < ScrW / ScrH) {
		let newRealH = realW * (ScrH / ScrW);
		scrTop += (realH - newRealH) / 2;
		realH = newRealH;
	}

	let scaleX = (ScrW / realW);
	let scaleY = (ScrH / realH);
	mouseX = (event.clientX - scrLeft) * scaleX;
	mouseY = (event.clientY - scrTop) * scaleY;
	mouseOffsetX = event.offsetX * scaleX;
	mouseOffsetY = event.offsetY * scaleY;
}

function init() {
	cvs = document.getElementById("gameCanvas");
	cvs.addEventListener("mousemove", event => {
		parseMouse(event);
		if (openMenu < 0 && event.buttons & 2) {
			if (dragMap) {
				shiftX += (mouseOffsetX - dragStartX)
				shiftY += (mouseOffsetY - dragStartY)
			} else {
				dragMap = true
			}
			dragStartX = mouseOffsetX
			dragStartY = mouseOffsetY
		} else {
			dragMap = false
			if (mouseX > 250 && mouseX < 550 && mouseY > 500) {
				hoveredButton = Math.floor((mouseX - 250) / 100);
			} else {
				hoveredButton = -1;
			}
		}
	})
	cvs.addEventListener("click", event => {
		if (hoveredButton >= 0) {
			openMenu = hoveredButton;
			menuScroll = 0;
		} else if (openMenu >= 0) {
			if (MENUS[openMenu].click) {
				MENUS[openMenu].click(event)
			}
		} else if (placingBuildable >= 0) {
			let validTileType = false;
			for (let t of BUILDABLES[placingBuildable].validTiles) {
				if (t == tiles[hoveredTileX][hoveredTileY]) {
					validTileType = true;
					break;
				}
			}

			// TODO: check if we have the resources and use them up

			if (validTileType) {
				// tileId is NOT the same as buildable Id, derp
				let tileId = FBN(TILES, BUILDABLES[placingBuildable].name);
				tiles[hoveredTileX][hoveredTileY] = tileId
				tilesByType[tileId].push({x: hoveredTileX, y: hoveredTileY});
			}

			placingBuildable = -1;
		} else if (mouseY <= 64 && mouseX >= 800 - 64) {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				cvs.requestFullscreen();
			}
		}
	})
	cvs.addEventListener("contextmenu", event => {
		event.preventDefault();
		closeCurrentMenu();
	})
	cvs.addEventListener("wheel", event => {
		event.preventDefault();
		if (openMenu >= 0) {
			/*
			if (event.deltaY > 0) {
				menuScroll++;
			} else if (event.deltaY < 0 && menuScroll > 0) {
				menuScroll--;
			}
			*/
		} else {
			parseMouse(event)
			let oldScale = scl
			if (event.deltaY < 0 && scl < 4) {
				scl *= 2
			} else if (event.deltaY > 0 && scl > 0.25) {
				scl *= 0.5
			}
			if (scl != oldScale) {
				shiftX = mouseX + (shiftX - mouseX) * (scl / oldScale)
				shiftY = mouseY + (shiftY - mouseY) * (scl / oldScale)
			}
		}
	})
	let menuKeys = {
		["1"]: 0,
		["2"]: 1,
		["3"]: 2,
		["4"]: 3
	}
	document.addEventListener("keydown", event => {
		if (event.repeat) return;
		if (menuKeys[event.key] != undefined) {
			openMenu = menuKeys[event.key];
		} else if (event.key == "Tab") {
			event.preventDefault();
			closeCurrentMenu();
		} else if (event.key.toLowerCase() == "f") {
			event.preventDefault();
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				cvs.requestFullscreen();
			}
		}
	})
	ctx = cvs.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	ctx.textBaseline = "middle";

	loadSprite("tile1");
	loadSprite("tile1_mip1");
	loadSprite("tile1_mip2");
	loadSprite("tile1b"); // TODO: farmland mips
	loadSprite("tile1c");
	loadSprite("tile1c_mip1");
	loadSprite("tile1c_mip2");
	loadSprite("tile2");
	loadSprite("tile2_mip1");
	loadSprite("tile2_mip2");

	loadSprite("tileselect");
	loadSprite("tileselect2");
	loadSprite("colonist0");
	loadSprite("colonist1");
	loadSprite("colonist2");
	loadSprite("colonist3");
	loadSprite("colonist4");
	loadSprite("colonist_think");

	for (let i = 0; i < 21; i++) {
		loadSprite("colonist_workbar" + i);
	}

	TILES.push({name: "Grass", mip: true})
	TILES.push({name: "Sand", mip: true})
	TILES.push({name: "Clay", sprite: loadSprite("tile_clay")})
	TILES.push({name: "Flag", sprite: loadSprite("tile_flag"), obstructsBehind: true})
	TILES.push({name: "Tree", sprite: loadSprite("tile_tree"), genWeight: 50, obstructsBehind: true, mip: true})
	TILES.push({name: "Saplings", sprite: loadSprite("tile_saplings"), genWeight: 20})
	TILES.push({name: "Berries", sprite: loadSprite("tile_berrybush"), genWeight: 16})
	TILES.push({name: "Rocks", sprite: loadSprite("tile_rocks"), genWeight: 10})
	TILES.push({name: "Boulder", sprite: loadSprite("tile_boulder"), genWeight: 8, obstructsBehind: true})
	TILES.push({name: "Copper Ore", sprite: loadSprite("tile_ore_copper"), genWeight: 4, obstructsBehind: true})
	TILES.push({name: "Tin Ore", sprite: loadSprite("tile_ore_tin"), genWeight: 3, obstructsBehind: true})
	TILES.push({name: "Iron Ore", sprite: loadSprite("tile_ore_iron"), genWeight: 2, obstructsBehind: true})
	TILES.push({name: "Gold Ore", sprite: loadSprite("tile_ore_gold"), genWeight: 1, obstructsBehind: true})

	ITEMS.push({name: "Stick", sprite: loadSprite("item_stick"), startWith: 20, startQuota: 10})
	ITEMS.push({name: "Stone", sprite: loadSprite("item_stone"), startWith: 20, startQuota: 10})
	ITEMS.push({name: "Berries", sprite: loadSprite("item_berries"), startWith: 20, startQuota: 10})
	ITEMS.push({name: "Clay", sprite: loadSprite("item_clay")})
	ITEMS.push({name: "Copper Ore", sprite: loadSprite("item_copper_ore")})
	ITEMS.push({name: "Tin Ore", sprite: loadSprite("item_tin_ore")})
	ITEMS.push({name: "Iron Ore", sprite: loadSprite("item_iron_ore")})
	ITEMS.push({name: "Gold Ore", sprite: loadSprite("item_gold_ore")})

	ITEMS.push({name: "Seeds", sprite: loadSprite("item_seeds")})
	ITEMS.push({name: "Grain", sprite: loadSprite("item_grain")})
	ITEMS.push({name: "Bread", sprite: loadSprite("item_bread")})
	ITEMS.push({name: "Brick", sprite: loadSprite("item_brick")})
	ITEMS.push({name: "Copper", sprite: loadSprite("item_copper")})
	//ITEMS.push({name: "Tin", sprite: loadSprite("item_tin")})
	ITEMS.push({name: "Bronze", sprite: loadSprite("item_bronze")})
	ITEMS.push({name: "Iron", sprite: loadSprite("item_iron")})
	ITEMS.push({name: "Gold", sprite: loadSprite("item_gold")})

	ITEMS.push({name: "Wood", sprite: loadSprite("item_wood"), startWith: 20})
	ITEMS.push({name: "Thread", sprite: loadSprite("item_thread")})
	ITEMS.push({name: "Sling", sprite: loadSprite("item_sling")})
	ITEMS.push({name: "Sling Ammo", sprite: loadSprite("item_sling_ammo")})
	ITEMS.push({name: "Hoe", sprite: loadSprite("item_hoe_stone")})
	ITEMS.push({name: "Bow", sprite: loadSprite("item_bow")})
	ITEMS.push({name: "Dynamite", sprite: loadSprite("item_dynamite")})
	ITEMS.push({name: "Gold Coins", sprite: loadSprite("item_coins")})

	ITEMS.push({name: "Stone Axe", sprite: loadSprite("item_axe_stone")})
	ITEMS.push({name: "Copper Axe", sprite: loadSprite("item_axe_copper")})
	ITEMS.push({name: "Bronze Axe", sprite: loadSprite("item_axe_bronze")})
	ITEMS.push({name: "Iron Axe", sprite: loadSprite("item_axe_iron")})
	ITEMS.push({name: "Stone Pickaxe", sprite: loadSprite("item_pickaxe_stone")})
	ITEMS.push({name: "Copper Pickaxe", sprite: loadSprite("item_pickaxe_copper")})
	ITEMS.push({name: "Bronze Pickaxe", sprite: loadSprite("item_pickaxe_bronze")})
	ITEMS.push({name: "Iron Pickaxe", sprite: loadSprite("item_pickaxe_iron")})

	ITEMS.push({name: "Stone Arrow", sprite: loadSprite("item_arrow_stone")})
	ITEMS.push({name: "Copper Arrow", sprite: loadSprite("item_arrow_copper")})
	ITEMS.push({name: "Bronze Arrow", sprite: loadSprite("item_arrow_bronze")})
	ITEMS.push({name: "Iron Arrow", sprite: loadSprite("item_arrow_iron")})

	for (const i in ITEMS) {
		stockpile[i] = ITEMS[i].startWith ? ITEMS[i].startWith : 0;
		stockpileQuota[i] = ITEMS[i].startQuota ? ITEMS[i].startQuota : 0;;
	}

	BUILDABLES.push({
		name: "Wattle Hut",
		desc: ["Houses up to 3 colonists."],
		sprite: loadSprite("tile_house2"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
	placementCost: [{item: FBN(ITEMS, "Stick"), amt: 20}]
	});
	BUILDABLES.push({
		name: "Brick House",
		desc: ["She's mighty mighty, housing", "up to 8 colonists."],
		sprite: loadSprite("tile_house1"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Brick"), amt: 30}]
	});
	BUILDABLES.push({
		name: "Stone Oven",
		desc: ["This simple oven can", "smelt clay & copper."],
		sprite: loadSprite("tile_oven_stone"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Stone"), amt: 10}]
	});
	BUILDABLES.push({
		name: "Brick Oven",
		desc: ["This sturdy oven gets hot", "enough to smelt bronze."],
		sprite: loadSprite("tile_oven_brick"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Brick"), amt: 20}]
	});
	BUILDABLES.push({
		name: "Bronze Oven",
		desc: ["This beauty can smelt so", "much iron & gold in it."],
		sprite: loadSprite("tile_oven_bronze"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Bronze"), amt: 20}]
	});
	BUILDABLES.push({
		name: "Workbench",
		desc: ["The essential bench for", "crafty colonists."],
		sprite: loadSprite("tile_workbench"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Stick"), amt: 8}]
	});
	BUILDABLES.push({
		name: "Chest",
		desc: ["Allows colonists access to the stockpile", "without returning to the flag."],
		sprite: loadSprite("tile_chest"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Wood"), amt: 8}]
	});
	BUILDABLES.push({
		name: "Stone Anvil",
		desc: ["Upon this rock, smiths", "fashion tools of copper."],
		sprite: loadSprite("tile_anvil_stone"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Stone"), amt: 20}]
	});
	BUILDABLES.push({
		name: "Bronze Anvil",
		desc: ["To make bronze tools, you're", "going to need a bronze anvil."],
		sprite: loadSprite("tile_anvil_bronze"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Bronze"), amt: 20}]
	});
	BUILDABLES.push({
		name: "Iron Anvil",
		desc: ["It slices, it dices, it makes iron", "tools, it even makes coins!"],
		sprite: loadSprite("tile_anvil_iron"),
		validTiles: [FBN(TILES, "Grass"), FBN(TILES, "Sand")],
		placementCost: [{item: FBN(ITEMS, "Iron"), amt: 20}]
	});

	// buildables are ultimately just tiles
	for (const i in BUILDABLES) {
		TILES.push(BUILDABLES[i])
	}

	for (const i in TILES) {
		// initialize quick lookup table to find tiles of a type
		// without iterating through the whole world
		tilesByType[i] = [];

		// auto-load mips for this sprite if they exist
		// mip2 goes first because Math.min(scl * 2) is used as index
		if (TILES[i].sprite && TILES[i].mip) {
			TILES[i].mipSprites = [loadSprite(TILES[i].sprite + "_mip2"), loadSprite(TILES[i].sprite + "_mip1")]
		}
	}

	workTiles = [
		[
			FBN(TILES, "Clay"),
			FBN(TILES, "Saplings"),
			FBN(TILES, "Berries"),
			FBN(TILES, "Rocks"),
		], [
			FBN(TILES, "Workbench")
		], [
			FBN(TILES, "Tree")
		], [
			FBN(TILES, "Boulder"),
			FBN(TILES, "Copper Ore"),
			FBN(TILES, "Tin Ore"),
			FBN(TILES, "Iron Ore"),
			FBN(TILES, "Gold Ore")
		], [
			FBN(TILES, "Stone Oven"),
			FBN(TILES, "Brick Oven"),
			FBN(TILES, "Bronze Oven"),
			FBN(TILES, "Stone Anvil"),
			FBN(TILES, "Bronze Anvil"),
			FBN(TILES, "Iron Anvil")
		]
	];

	// collection
	addRecipe("Berries", ["Berries", 1])
	addRecipe("Clay", ["Clay", 1])
	addRecipe("Rocks", ["Stone", 1])
	addRecipe("Saplings", ["Stick", 1])
	addRecipe("Tree", ["Wood", 1], false, ["Stone Axe", "Copper Axe", "Bronze Axe", "Iron Axe"])

	// mining
	addRecipe("Boulder", ["Stone", 3], false, ["Stone Pickaxe", "Copper Pickaxe", "Bronze Pickaxe", "Iron Pickaxe"])
	addRecipe("Copper Ore", ["Copper Ore", 1], false, ["Stone Pickaxe", "Copper Pickaxe", "Bronze Pickaxe", "Iron Pickaxe"])
	addRecipe("Tin Ore", ["Tin Ore", 1], false, ["Copper Pickaxe", "Bronze Pickaxe", "Iron Pickaxe"])
	addRecipe("Iron Ore", ["Iron Ore", 1], false, ["Bronze Pickaxe", "Iron Pickaxe"])
	addRecipe("Gold Ore", ["Gold Ore", 1], false, ["Iron Pickaxe"])

	addRecipe("Stone Oven", ["Brick", 1], [["Wood", 1], ["Clay", 1]])
	addRecipe("Stone Oven", ["Copper", 1], [["Wood", 1], ["Copper Ore", 3]])
	addRecipe("Brick Oven", ["Brick", 1], [["Wood", 1], ["Clay", 1]])
	addRecipe("Brick Oven", ["Copper", 1], [["Wood", 1], ["Copper Ore", 3]])
	addRecipe("Brick Oven", ["Bronze", 1], [["Wood", 1], ["Copper Ore", 2], ["Tin Ore", 1]])
	addRecipe("Bronze Oven", ["Brick", 1], [["Wood", 1], ["Clay", 1]])
	addRecipe("Bronze Oven", ["Copper", 1], [["Wood", 1], ["Copper Ore", 3]])
	addRecipe("Bronze Oven", ["Bronze", 1], [["Wood", 1], ["Copper Ore", 2], ["Tin Ore", 1]])
	addRecipe("Bronze Oven", ["Iron", 1], [["Wood", 1], ["Iron Ore", 3]])
	addRecipe("Bronze Oven", ["Gold", 1], [["Wood", 1], ["Gold Ore", 3]])

	addRecipe("Workbench", ["Stone Axe", 1], [["Stick", 3], ["Stone", 3]])
	addRecipe("Workbench", ["Stone Pickaxe", 1], [["Stick", 3], ["Stone", 3]])
	addRecipe("Workbench", ["Stick", 3], [["Wood", 1]])

	addRecipe("Stone Anvil", ["Copper Axe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Stone Anvil", ["Copper Pickaxe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Bronze Anvil", ["Copper Axe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Bronze Anvil", ["Copper Pickaxe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Bronze Anvil", ["Bronze Axe", 1], [["Stick", 3], ["Bronze", 3]])
	addRecipe("Bronze Anvil", ["Bronze Pickaxe", 1], [["Stick", 3], ["Bronze", 3]])
	addRecipe("Iron Anvil", ["Copper Axe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Iron Anvil", ["Copper Pickaxe", 1], [["Stick", 3], ["Copper", 3]])
	addRecipe("Iron Anvil", ["Bronze Axe", 1], [["Stick", 3], ["Bronze", 3]])
	addRecipe("Iron Anvil", ["Bronze Pickaxe", 1], [["Stick", 3], ["Bronze", 3]])
	addRecipe("Iron Anvil", ["Iron Axe", 1], [["Stick", 3], ["Iron", 3]])
	addRecipe("Iron Anvil", ["Iron Pickaxe", 1], [["Stick", 3], ["Iron", 3]])
	addRecipe("Iron Anvil", ["Gold Coins", 3], [["Gold", 1]])

	loadSprite("ui_bigmenu")
	loadSprite("ui_check")
	loadSprite("ui_x")
	loadSprite("ui_plus")
	loadSprite("ui_minus")
	loadSprite("ui_arrow")
	loadSprite("ui_fullscreen0")
	loadSprite("ui_fullscreen1")

	loadSprite("ui_hotbar0a")
	loadSprite("ui_hotbar0b")
	loadSprite("ui_hotbar1a")
	loadSprite("ui_hotbar1b")
	loadSprite("ui_hotbar2a")
	loadSprite("ui_hotbar2b")
	loadSprite("ui_hotbar_hovered")

	// generate tiles for our world
	for (let x = 0; x < gridSize; x++) {
		tiles[x] = {};
		tileData[x] = {};
		for (let y = 0; y < gridSize; y++) {
			let tileType = generateTile(x, y);
			tiles[x][y] = tileType;

			if (tileType > -1) {
				// add to quick lookup table for tiles of this kind
				if (!tilesByType[tileType]) {
					tilesByType[tileType] = [];
				}
				tilesByType[tileType].push({x: x, y: y});
			}
		}
	}

	// colonist z-sorting structure
	guyTiles = [];
	for (let x = 0; x < gridSize; x++) {
		guyTiles[x] = [];
	}

	//setInterval(think, 500);
	//setInterval(draw, 16);
	(function animloop(){
		draw();
		setTimeout(() => {
			window.requestAnimFrame(animloop);
		}, 16)
	})();

	//for (let i = 0; i < 30; i++) {
		//new Colonist(randomRange(0, 4));
	//}
	//new Colonist(1);
}
