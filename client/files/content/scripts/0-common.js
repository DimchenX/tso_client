var forcegcIntervalId = null;
var enabledScripts = {};
var mainSettings = {
	menuStyle: 'grouped',
	geoDefTask: 0,
	explDefTask: 0,
	specDefTimeType: false,
	defFilter: 'none',
	dtfFormat: "MM-dd HH:mm",
	forcegc: true,
	sortOrder: 6
};

function reloadScripts(event)
{
	menu.clearTools();
	air.File.applicationDirectory.resolvePath("userscripts").getDirectoryListing().forEach(function(item) {
		if(enabledScripts[item.name] || enabledScripts[item.name] == undefined) {
			$('head').append($("<script>").attr({ "src": "userscripts/" + item.name + "?" + new Date().getTime(), "id": "user", "type": "text/javascript"}));
		}
	});
}

function humanMemorySize(bytes, dp) {
	const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	var u = -1;
	do {
		bytes /= 1024;
		u++;
	} while (Math.round(Math.abs(bytes) * 10) / 10 >= 1024 && u < units.length - 1);
	return bytes.toFixed(dp) + ' ' + units[u];
}
function getText(id, module)
{
	var searchPath = !module ? baseTranslation[gameLang] : baseTranslation[module][gameLang],
		backupPath = !module ? baseTranslation["en-uk"] : baseTranslation[module]["en-uk"];
	searchPath = typeof searchPath == "undefined" ? {} : searchPath;
	backupPath = typeof backupPath == "undefined" ? {} : backupPath;
	if(!searchPath[id] && !backupPath[id]) { return "RES not found : " + id; }
	return searchPath[id] ? searchPath[id] : backupPath[id];
}

function extendBaseLang(data, module)
{
	var extend_data = {};
	if(module) {
		extend_data[module] = data;
	} else {
		extend_data = data;
	}
	$.extend(baseTranslation, extend_data);
}

function debug(obj)
{
	if(typeof air.Introspector !== 'undefined') {
		air.Introspector.Console.log(obj);
	}
}

function specNameSorter(a, b)
{
	try {
		switch(mainSettings.sortOrder) {
			case 0:
				return a.GetType() > b.GetType() ? -1 : 1;
			break;
			case 1:
				return a.GetType() > b.GetType() ? 1 : -1;
			break;
			case 2:
				if (a.GetType() < b.GetType()) return -1;
				if (a.GetType() > b.GetType()) return 1;
				return b.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase().localeCompare(a.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase());
			break;
			case 3:
				if (a.GetType() < b.GetType()) return -1;
				if (a.GetType() > b.GetType()) return 1;
				return a.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase().localeCompare(b.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase());
			break;
			case 4:
				return b.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase().localeCompare(a.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase());
			break;
			case 5:
				return a.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase().localeCompare(b.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase());
			break;
			case 6:
				var res = a.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase().localeCompare(b.getName(false).replace(/(<([^>]+)>)/gi, "").toLowerCase());
				return res != 0 ? res : a.GetType() > b.GetType() ? -1 : 1;
			break;
			default:
				return 0;
			break;
		}
	} catch (e) { return 0; }
}

function mainSettingsHandler(event)
{
	var w = new Modal('mainSettings', utils.getImageTag('icon_dice.png', '45px') + ' '+loca.GetText("LAB", "ToggleOptionsPanel"));
	var getDefFolder = function(id){
		return $('<span>', { 'class': id }).html(mainSettings[id] ? mainSettings[id] : air.File.documentsDirectory.nativePath).prop('outerHTML');
	};
	var getDefTimeType = function(){
		return !mainSettings.specDefTimeType ? getText('spec_time_normal') : getText('spec_time_arrival');
	};
	var createFilterDrop = function(){
		const filters = ["none","snownowater","snowlight","snow","oven","doomsday","night","desert","tropical","blackandwhite","spooky","snow_medium","tundra","darkershadow","magicsepia"];
		var select = $('<select>', { 'class': 'form-control defFilter' });
		for(var i in filters) {
			select.append($('<option>', { value: filters[i] }).text(filters[i]));
		}
		return select.prop('outerHTML');
	};
	var createDateFormatterDrop = function(){
		const formats = ['M-d H:m','d-M H:m','MM-dd HH:mm','dd-MM-yyyy hh:mm','yyyy-MM-dd HH:mm'];
		var select = $('<select>', { 'class': 'form-control dtfFormat' });
		for(var i in formats) {
			select.append($('<option>', { value: formats[i] }).text(formats[i]));
		}
		return select.prop('outerHTML');
	}
	var createButton = function(id, text) {
		return $('<button>', { 
			'style': 'cursor: pointer;text-decoration:none;color:#000;height: 20px;padding: 0px;',
			'class': 'btn form-control',
			'id': id
		}).text(text)
	}
	w.size = '';
	w.create();
	var html = '<div class="container-fluid" style="user-select: all;">';
	html += utils.createTableRow([[6, loca.GetText("LAB", "Name")], [6, loca.GetText("LAB", "AvatarCurrentSelection")]], true);
	var menuStyleSelector = $('<select>', { 'class': 'form-control menuStyle' });
	menuStyleSelector.append([
		$('<option>', { 'value': 'grouped' }).text(getText('menustyle_grouped')),
		$('<option>', { 'value': 'linear' }).text(getText('menustyle_linear')),		
	]);
	var sortNameSelector = $('<select>', { 'class': 'form-control sortOrder' });
	sortNameSelector.append([
		$('<option>', { 'value': 0 }).text('{0} (DESC)'.format(getText('sortbytype'))),
		$('<option>', { 'value': 1 }).text('{0} (ASC)'.format(getText('sortbytype'))),
		$('<option>', { 'value': 2 }).text('{0} > {1} (DESC)'.format(getText('sortbytype'), getText('sortbyname'))),
		$('<option>', { 'value': 3 }).text('{0} > {1} (ASC)'.format(getText('sortbytype'), getText('sortbyname'))),
		$('<option>', { 'value': 4 }).text('{0} (DESC)'.format(getText('sortbyname'))),
		$('<option>', { 'value': 5 }).text('{0} (ASC)'.format(getText('sortbyname'))),
		$('<option>', { 'value': 6 }).text(loca.GetText("LAB", "StarMenu")),
	]);
	html += utils.createTableRow([[6, getText('menustyle_desc')], [6, menuStyleSelector.prop('outerHTML')]]);
	html += utils.createTableRow([[6, getText('deffilter_desc')], [6, createFilterDrop()]]);
	html += utils.createTableRow([[6, getText('dateformat_desc')], [6, createDateFormatterDrop()]]);
	html += utils.createTableRow([[9, getText('geotemplates_desc') + getDefFolder('geolastDir')], [3, createButton('geolastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[9, getText('expltemplates_desc') + getDefFolder('expllastDir')], [3, createButton('expllastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[9, getText('bufftemplates_desc') + getDefFolder('bufflastDir')], [3, createButton('bufflastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[9, getText('buitemplates_desc') + getDefFolder('builastDir')], [3, createButton('builastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[9, getText('armytemplates_desc') + getDefFolder('armylastDir')], [3, createButton('armylastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[9, getText('battletemplates_desc') + getDefFolder('battlelastDir')], [3, createButton('battlelastDir', loca.GetText("LAB", "Select"))]]);
	html += utils.createTableRow([[6, getText('geodeftask_desc')], [6, createGeologistDropdown(0, 0, true), 'geoMass']]);
	html += utils.createTableRow([[6, getText('expldeftask_desc')], [6, createExplorerDropdown(0, 0, 0, true), 'explMass']]);
	html += utils.createTableRow([
		[6, getText('spectimetype_desc')], 
		[6, createSwitch('specDefTimeType', mainSettings.specDefTimeType) + '<div style="position: absolute;left: 55px;top: 1px;" id="specTimeTypeLang">{0}</div>'.format(getDefTimeType())]
	]);
	html += utils.createTableRow([[6, getText('sortorder_desc')], [6, sortNameSelector.prop('outerHTML')]]);
	html += utils.createTableRow([[6, "Force use GC"], [6, createSwitch('forcegc', mainSettings.forcegc)]]);
	w.Body().html(html + '<div>');
	w.withBody('button').click(function(e) { 
		var id = $(e.target).attr('id');
		var file = new air.File(); 
		file.addEventListener(air.Event.SELECT, function(event){
			mainSettings[id] = file.nativePath;
			w.withBody('.' + id).html(file.nativePath);
		}); 
		file.browseForDirectory("Select a directory"); 
	});
	w.withBody('.menuStyle').val(mainSettings.menuStyle).change(function(e) { mainSettings.menuStyle = $(e.target).val(); });
	w.withBody('.sortOrder').val(mainSettings.sortOrder).change(function(e) { mainSettings.sortOrder = parseInt($(e.target).val()); });
	w.withBody('.defFilter').val(mainSettings.defFilter).change(function(e) { mainSettings.defFilter = $(e.target).val(); });
	w.withBody('.dtfFormat').val(mainSettings.dtfFormat).change(function(e) { mainSettings.dtfFormat = $(e.target).val(); });
	w.withBody('.geoMass select').val(mainSettings.geoDefTask).change(function(e) { mainSettings.geoDefTask = $(e.target).val(); });
	w.withBody('.explMass select').val(mainSettings.explDefTask).change(function(e) { mainSettings.explDefTask = $(e.target).val(); });
	w.withBody('#specDefTimeType').change(function(e) {
		mainSettings.specDefTimeType = $(e.target).is(':checked');
		w.withBody('#specTimeTypeLang').html(getDefTimeType());
	});
	w.withBody('#forcegc').change(function(e) {	
		mainSettings.forcegc = $(e.target).is(':checked');
		toggleForceGC();
	});
	w.Footer().prepend($("<button>").attr({'class':"btn btn-primary pull-left"}).text(loca.GetText("LAB","Save")).click(function(){
		settings.store(mainSettings);
		if(menu.type != mainSettings.menuStyle) {
			menu.type = mainSettings.menuStyle;
			menu.show();
			reloadScripts(null);
			shortcutsMakeMenu();
		}
		setFilterHandler(mainSettings.defFilter);
		dtf.setDateTimePattern(mainSettings.dtfFormat); 
		w.hide();
	}));
	w.show();
}

function toggleForceGC()
{
	if(!forcegcIntervalId) {
		forcegcIntervalId = setInterval(function() { window.runtime.flash.system.System.gc(); }, 60000);
	} else {
		clearInterval(forcegcIntervalId);
	}
}

function setFilterHandler(filter, init)
{
	if(init && filter == 'none') { return; }
	game.def("defines").CLIENT_FILTER = true;
	game.def("gGfxResource").applyFilter(filter, game.gi);
	game.def("defines").CLIENT_FILTER = false;
}

function menuFilterHandler(event)
{
	setFilterHandler(event.target.name);
}

function menuZoneRefreshHandler(event)
{
	swmmo.application.mGameInterface.mClientMessages.SendMessagetoServer(1037, swmmo.application.mGameInterface.mCurrentViewedZoneID, null);
	showGameAlert(getText('command_sent'));
}

function menuCustomHandler(event)
{
	try
	{
		$('script[id="custom"]').remove();
		var file = new air.File("file:///" + air.File.applicationDirectory.resolvePath("custom.js").nativePath),
			fileStream = new air.FileStream();
		fileStream.open(file, air.FileMode.WRITE);
		fileStream.writeMultiByte("(function () { try {" + prompt("Code") + "} catch (err) { alert(err);} })();", "utf-8");
		fileStream.close();
		$('head').append($("<script>").attr({ "src": "custom.js?" + new Date().getTime(), "id": "custom", "type": "text/javascript"}));
	} catch (e) { 
		alert(e);
	}
}

function menuSaveHandler(event)
{
	var file = air.File.documentsDirectory.resolvePath("swmmo.html");
	file.save($('html').prop('outerHTML'));
}

function menuDebugHandler(event)
{
	if(typeof air.Introspector=='undefined') {
		$('head').append($("<script>").attr({ "src": "AIRIntrospector.js", "type": "text/javascript"}));
		setTimeout(function(){ air.Introspector.toggleWindow(); }, 2000);
	} else {
		air.Introspector.toggleWindow();
	}
}

function feedbackMenuHandler(event)
{
	var w = new Modal('feedbackWindow', utils.getImageTag('ValentineAdventureRewardBoostConditional', '45px') + ' ' + getText('feedbacktitle'));
	w.create();
	w.Footer().prepend([$('<button>').attr({ "class": "btn btn-primary pull-left feedbackSend" }).text(loca.GetText("LAB", "Send"))]);
	var html = '<div class="container-fluid" style="user-select: all;">';
	html += '<p>{1}</p><p style="float: right;"><small>{2} (aka SirriS)</small></p>'.format(getText('feedbacktitle'),getText('feedbackdescription'),getText('feedbackregards'));
	html += '<textarea maxlength=2000 id="feedbackContent" style="width:100%;height:70%;background:none;"/>';
	w.Body().html(html + '<div>');
	w.withFooter('.feedbackSend').click(function() {
		var val = w.withBody('#feedbackContent').val();
		if(val.length < 5) { return; }
		feedbackSendMessage(val);
	});
	w.show();
	setTimeout(function() { w.withBody('#feedbackContent').focus() }, 1000);
}

function openWikiHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://github.com/fedorovvl/tso_client/wiki"));
}

function openDiscordHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://discord.gg/ScB7RsvxfB"));
}
function openDiscordFRHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://discord.gg/9G5X7VhA"));
}
function openDiscordENHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://discord.gg/jQZnNAXg99"));
}
function openDiscordDEHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://discord.gg/rm6kmzhPg2"));
}
function openDonateHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://ko-fi.com/sirris"));
}
function openDonateTfHandler(event)
{
	air.navigateToURL(new air.URLRequest("https://www.tinkoff.ru/cf/7qUyCUSg6ju"));
}

//backward compatibility
function createModalWindow(id, title, drop) {	new Modal(id, title, drop||false).create(); }
function createSettingsWindow(id, savefunc, size) {	new Modal(id, '').settings(savefunc, size); }
function showAlert(message, sameLayer, level) {	game.showAlert(message); }
function showGameAlert(message){ game.showAlert(message); }
function storeSettings(data, module) { settings.store(data, module); }
function readSettings(key, module) { return settings.read(key, module); }
function getImageByModule(module, name, w, h) { return utils.getImageByModule(module, name, w, h); }
function getImage(bd, w, h) { return utils.getImage(bd, w, h); }
function getImageTag(name, w, h) { return utils.getImage(assets.GetBitmapData(name), w, h); }
function createTableRow(data, isHeader){ return utils.createTableRow(data, isHeader); }
function createSwitch(checkboxId, isChecked){ return utils.createSwitch(checkboxId, isChecked); }
function addToolsMenuItem(name, fn, key, ctrl, shiftKey, altKey) { try{ menu.addToolsItem(name, fn, key, ctrl, shiftKey, altKey); }catch(e){alert(e);} }
function saveLastDir(type, dir) { 
	var l = {};
	l[type + 'lastDir'] = dir;
	settings.store(l);
}
function readLastDir(type) {
	var l = settings.read(type + 'lastDir');
	return l != null ? l : air.File.documentsDirectory.nativePath;
}

var Utils=function(){this.b64=game.def("mx.utils::Base64Encoder",!0),this.b64.insertNewLines=!1,this.pngOpts=new window.runtime.flash.display.PNGEncoderOptions(!0)};Utils.prototype={getImage:function(t,e,a){var r=t.encode(t.rect,this.pngOpts);return this.b64.encodeBytes(r),$("<img>",{'style':"width: {0};height: {1};".format(e||"auto",a||"auto"),src:"data:image/png;base64,{0}".format(this.b64.toString())}).prop("outerHTML")},getImageTag:function(t,e,a){return this.getImage(assets.GetBitmapData(t),e,a)},getImageByModule:function(t,e,a,r){var s=assets.GetDummyIcon("{0}:{1}".format(t,e)).bitmapData;return this.getImage(s,a,r)},createTableRow:function(t,e){var a=$("<div>",{'class':"row"}),r=0;return t.forEach(function(s){r++;var n=$("<div>",{'class':"col-xs-{0} col-sm-{0} col-lg-{0}".format(s[0])}).html(s[1]);e&&n.addClass("tblHeader"),s[2]&&n.addClass(s[2]),n.attr("style",e?"border-radius:{0};".format(1==r?"10px 0px 0px 10px":r==t.length?"0px 10px 10px 0px":"0px"):""),a.append(n)}),a.prop("outerHTML")},createSwitch:function(t,e,a){var r=$("<label>",{'class':"switch"}).append($("<input>",{'type':"checkbox",'id':t,'checked':e})).append($("<span/>",{'class':"slider round"}));return a&&r.change(a),r.prop("outerHTML")}};var Modal=function(t,i,e){this.id="#"+t,this.rawId=t,this.sId="#"+t+"settings",this.rawsId=t+"settings",this.title=i,this.removeHiding="boolean"!=typeof e||e,this.size='modal-lg'};Modal.prototype={hide:function(){$(this.id).modal('hide')},show:function(){$("div[role='dialog']:not("+this.id+"):visible").modal("hide"),$(this.id+':not(:visible)').modal({backdrop: "static"})},create:function(){!($(this.id).length>0)&&($("#dummyModal").clone().attr("id",this.rawId).appendTo(".container"),$(this.getTitleId(this.id)).html(this.title),$(this.getBodyId(this.id)).attr("id",this.getDataId(this.rawId)),$(this.getDialogId(this.id)).removeClass("modal-lg").addClass(this.size),$(this.id+" .btnClose").text(loca.GetText("LAB","Close")),$(this.id).on("show.bs.modal hide.bs.modal",function(e){window.nativeWindow.stage.swapChildrenAt(0,1)}),this.removeHiding&&$(this.id).on("hidden.bs.modal",function(t){$(t.target).remove()}))},settings:function(t,i){!($(this.sId).length>0)&&($("#dummyModal").clone().attr("id",this.rawsId).appendTo(".container"),$(this.getTitleId(this.sId)).addClass("text-center").html(loca.GetText("LAB","ToggleOptionsPanel")),$(this.getBodyId(this.sId)).attr("id",this.getDataId(this.rawsId)),$(this.getDialogId(this.sId)).removeClass("modal-lg").addClass("modal-dialog-centered "+(i||"")),$(this.sId+" .btnClose").text(loca.GetText("LAB","Close")),$(this.getFooterId(this.sId)).prepend([$("<button>").attr({'class':"btn btn-primary pull-left"}).text(loca.GetText("LAB","Save")).click(t)]),$(this.sId).on("hidden.bs.modal",function(t){$(t.target).remove()}))},withBody:function(t){return $("{0} {1}".format(this.getBodyId(this.id),t))},withsBody:function(t){return $("{0} {1}".format(this.getBodyId(this.sId),t))},withHeader:function(t){return $("{0} {1} {2}".format(this.id,'.modal-header',t))},withFooter:function(t){return $("{0} {1}".format(this.getFooterId(this.id),t))},Title:function(){return $(this.id+" .modal-title")},Body:function(){return $(this.id+" .modal-body")},Data:function(){return $(this.id+"Data")},Footer:function(){return $(this.id+" .modal-footer")},Dialog:function(){return $(this.id+" .modal-dialog")},sTitle:function(){return $(this.sId+" .modal-title")},sBody:function(){return $(this.sId+" .modal-body")},sData:function(){return $(this.sId+"Data")},sFooter:function(){return $(this.sId+" .modal-footer")},sDialog:function(){return $(this.sId+" .modal-dialog")},getTitleId:function(t){return t+" .modal-title"},getBodyId:function(t){return t+" .modal-body"},getDataId:function(t){return t+"Data"},getFooterId:function(t){return t+" .modal-footer"},getDialogId:function(t){return t+" .modal-dialog"}};var Settings=function(){this.file=new air.File("file:///"+air.File.applicationDirectory.resolvePath(settingsFile).nativePath),this.fs=new air.FileStream,this.settings={}};Settings.prototype={load:function(){try{this.file.exists&&(this.fs.open(this.file,"read"),this.settings=JSON.parse(this.fs.readUTFBytes(this.fs.bytesAvailable)),this.fs.close())}catch(t){alert("Error loading settings "+t)}},save:function(){try{this.fs.open(this.file,"write"),this.fs.writeUTFBytes(JSON.stringify(this.settings,null,"  ")),this.fs.close()}catch(t){alert("Error saving settings "+t)}},store:function(t,s){(edata={})[s||"global"]=t,$.extend(!0,this.settings,edata),this.save()},read:function(t,s){try{if(s=s||"global",!this.settings[s]||t&&!this.settings[s][t])return null;return t?this.settings[s][t]:this.settings[s]}catch(i){alert("Settings read error "+i)}}};var SaveLoadTemplate=function(t,e,z){this.module=t,this.loadCallback=e,this.saveCallback=z,this.lastDir=settings.read(t+"lastDir")};SaveLoadTemplate.prototype={setModule:function(t){this.module=t;this.lastDir=settings.read(t+"lastDir")},save:function(t,z){var e=this;file=new air.File(this.getLastDir()).resolvePath("{0}Template.txt".format(this.module)),file.addEventListener(air.Event.COMPLETE,(function(t){var a={};a[e.module+"lastDir"]=t.target.parent.nativePath,e.lastDir=t.target.parent.nativePath,settings.store(a),a.saveCallback&&a.saveCallback(),z&&z()})),file.save(JSON.stringify(t,null," "))},getLastDir:function(){return null!=this.lastDir?this.lastDir:air.File.documentsDirectory.nativePath},load:function(){var t=this;file=new air.File(this.getLastDir()),txtFilter=new air.FileFilter("All files","*.*"),file.browseForOpen("Open",[txtFilter]),file.addEventListener(air.Event.SELECT,(function(e){e.target.addEventListener(air.Event.COMPLETE,(function(e){try{var a=JSON.parse(e.target.data);t.loadCallback(a)}catch(t){return void alert(getText("bad_template"))}})),e.target.load()}))}};function feedbackSendMessage(e){var z=['aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd','2ViaG9va3MvMTA4MzQ2NjU5NTU1MDEy','MjAyNC9peGhjUEs1aXlMQm1vMXlKSlR','5R3RwSkxDNnlYZGFVWTFRVUI5VzlVU2tqZ3'],a={username:"Client",content:"",embeds:[{author:{name:document.title},title:gameLang,description:"`"+e+"`",color:15258703}]},t=new(game.def("mx.utils::Base64Decoder"));t.decode(z.join('')+"pBUDNmZVVUME9RTkR5bGJiLWM5WVozVAo="),$.ajax({type:"POST",url:t.toByteArray(),data:JSON.stringify(a),contentType:"application/json; charset=utf-8",dataType:"json",success:function(e){$("#feedbackContent").val(getText('feedbacksended')),$('.feedbackSend').hide()},error:function(e){$("#feedbackContent").val(getText('feedbackerror')+" "+e)}})};var TimedQueue=function(e){this.queue=[],this.index=0,this.defaultDelay=e||3e3};TimedQueue.prototype={add:function(e,t){this.queue.push({fn:e,delay:t})},run:function(e){(e||0===e)&&(this.index=e),this.next()},len:function(){return this.queue.length},next:function(){var e=this,t=this.index++,i=this.queue[t],n=this.queue[this.index];i&&(i.fn(),n&&setTimeout((function(){e.next()}),n.delay||this.defaultDelay))},reset:function(){this.index=0}};String.prototype.format=function(){var r=arguments;return this.replace(/{(\d+)}/g,(function(t,n){return void 0!==r[n]?r[n]:t}))};var xmlToJSON = function () { this.version = "1.3.4"; var e = { mergeCDATA: !0, grokAttr: !0, grokText: !0, normalize: !0, xmlns: !0, namespaceKey: "_ns", textKey: "_text", valueKey: "_value", attrKey: "_attr", cdataKey: "_cdata", attrsAsObject: !0, stripAttrPrefix: !0, stripElemPrefix: !0, childrenAsArray: !0 }, t = new RegExp(/(?!xmlns)^.*:/), r = new RegExp(/^\s+|\s+$/g); return this.grokType = function (e) { return /^\s*$/.test(e) ? null : /^(?:true|false)$/i.test(e) ? "true" === e.toLowerCase() : isFinite(e) ? parseFloat(e) : e }, this.parseString = function (e, t) { return this.parseXML(this.stringToXML(e), t) }, this.parseXML = function (a, n) { for (var s in n) e[s] = n[s]; var l = {}, i = 0, o = ""; if (e.xmlns && a.namespaceURI && (l[e.namespaceKey] = a.namespaceURI), a.attributes && a.attributes.length > 0) { var c = {}; for (i; i < a.attributes.length; i++) { var u = a.attributes.item(i); m = {}; var p = ""; p = e.stripAttrPrefix ? u.name.replace(t, "") : u.name, e.grokAttr ? m[e.valueKey] = this.grokType(u.value.replace(r, "")) : m[e.valueKey] = u.value.replace(r, ""), e.xmlns && u.namespaceURI && (m[e.namespaceKey] = u.namespaceURI), e.attrsAsObject ? c[p] = m : l[e.attrKey + p] = m } e.attrsAsObject && (l[e.attrKey] = c) } if (a.hasChildNodes()) for (var y, d, m, h = 0; h < a.childNodes.length; h++)4 === (y = a.childNodes.item(h)).nodeType ? e.mergeCDATA ? o += y.nodeValue : l.hasOwnProperty(e.cdataKey) ? (l[e.cdataKey].constructor !== Array && (l[e.cdataKey] = [l[e.cdataKey]]), l[e.cdataKey].push(y.nodeValue)) : e.childrenAsArray ? (l[e.cdataKey] = [], l[e.cdataKey].push(y.nodeValue)) : l[e.cdataKey] = y.nodeValue : 3 === y.nodeType ? o += y.nodeValue : 1 === y.nodeType && (0 === i && (l = {}), d = e.stripElemPrefix ? y.nodeName.replace(t, "") : y.nodeName, m = xmlToJSON.parseXML(y), l.hasOwnProperty(d) ? (l[d].constructor !== Array && (l[d] = [l[d]]), l[d].push(m)) : (e.childrenAsArray ? (l[d] = [], l[d].push(m)) : l[d] = m, i++)); else o || (e.childrenAsArray ? (l[e.textKey] = [], l[e.textKey].push(null)) : l[e.textKey] = null); if (o) if (e.grokText) { var x = this.grokType(o.replace(r, "")); null !== x && void 0 !== x && (l[e.textKey] = x) } else e.normalize ? l[e.textKey] = o.replace(r, "").replace(/\s+/g, " ") : l[e.textKey] = o.replace(r, ""); return l }, this.xmlToString = function (e) { try { return e.xml ? e.xml : (new XMLSerializer).serializeToString(e) } catch (e) { return null } }, this.stringToXML = function (e) { try { var t = null; return window.DOMParser ? t = (new DOMParser).parseFromString(e, "text/xml") : (t = new ActiveXObject("Microsoft.XMLDOM"), t.async = !1, t.loadXML(e), t) } catch (e) { return null } }, this }.call({}); "undefined" != typeof module && null !== module && module.exports ? module.exports = xmlToJSON : "function" == typeof define && define.amd && define(function () { return xmlToJSON });utils = new Utils();settings = new Settings();settings.load();$.extend(mainSettings, settings.read());setFilterHandler(mainSettings.defFilter, true);dtf.setDateTimePattern(mainSettings.dtfFormat);if(mainSettings.forcegc) { toggleForceGC(); }$.extend(enabledScripts, settings.read(null, "scripts"));