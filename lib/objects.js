const DISTANCE_BETWEEN = 200;
const MIN_HEIGHT = 50;
const FONT_HEIGHT = 12;
const COURSE_RAD = 10;
const RECT_MIN_WIDTH = 50;
const RECT_MIN_HEIGHT = 50;
const RECT_MAX_WIDTH = 100;
const RECT_MAX_HEIGHT = 200;
const PATH_WIDTH = 10;

function GenerateObject(typeName, implementsObject){
	var result = function(args){
		if(this instanceof arguments.callee){
			if(typeof this.init === 'function'){
				this.init.apply(this, args != undefined ? (args.callee ? args : arguments) : null);
			}
		}else {
			return new arguments.callee(arguments);
		}
	}

	if(implementsObject){
		result.prototype = Object.create(implementsObject.prototype);
	}

	result.prototype.getType = function(){ return typeName };

	return result;
}

var NodeColour = function(r = 0, g = 0, b = 0){
	return new Uint8Array([r, g, b]);
};
{
	NodeColour.toHexString = function(colour){
		return '#' + colour[0].toString(16).padStart(2, '0')
			+ colour[1].toString(16).padStart(2, '0')
			+ colour[2].toString(16).padStart(2, '0');
	}

	NodeColour.add = function(c1, c2, out = null){
		if(out == null){
			out = new Uint8Array(3);
		}

		out[0] = c1[0] + c2[0];
		out[1] = c1[1] + c2[1];
		out[2] = c1[2] + c2[2];

		return out;
	}

	NodeColour.subtract = function(c1, c2, out = null){
		if(out == null){
			out = new Uint8Array(3);
		}

		out[0] = c1[0] - c2[0];
		out[1] = c1[1] - c2[1];
		out[2] = c1[2] - c2[2];

		return out;
	}

	NodeColour.multiply = function(c1, c2, out = null){
		if(out == null){
			out = new Uint8Array(3);
		}

		out[0] = Math.floor((c1[0] * c2[0]) / 255);
		out[1] = Math.floor((c1[1] * c2[1]) / 255);
		out[2] = Math.floor((c1[2] * c2[2]) / 255);

		return out;
	}
}

var Config = GenerateObject("Config");
{
	Config.prototype.init = function(){
		this.blendMode = "No Blend";
		this.title = "Unknown";
		this.windowTitle = "Unknown";
		this.mapStyle = "Left";
	}

	Config.prototype.loadFromServer = function(config){
		var values = config.rowData;

		for(var i = 0; i < values.length; ++i){
			var name = values[i].values[0].formattedValue.toLowerCase();
			var value = values[i].values[1].formattedValue;

			switch(name){
				case "blend mode":
					this.blendMode = value;
					break;

				case "window title":
					this.windowTitle = value;
					break;

				case "title":
					this.title = value;
					break;

				case "map style":
					this.mapStyle = value;
					break;
			}
		}
	}
}

var Menu = GenerateObject("Menu", null);
{
	function updateViewbox(svg, menu) {
		var v = menu.viewBox;

		v[2] = (v[4] * v[6]);
		v[3] = (v[5] * v[6]);

		svg.attr("viewBox", v[0] + ' ' + v[1] + ' ' + v[2] + ' ' + v[3] );
	}

	function resizeSvg(svg, menu) {
		var parentDim = svg.node().parentNode.getBoundingClientRect();
		svg.attrs({
			width: parentDim.width,
			height: parentDim.height
		});

		menu.viewBox[4] = parentDim.width;
		menu.viewBox[5] = parentDim.height;

		updateViewbox(svg, menu);
	}

	function addMouseCommands(menu){
		var svg = d3.selectAll(menu.containerPath).selectAll("svg");

		svg.call(d3.drag()
			.on('start', function(d){
				
			})
			.on('drag', function(d){
				var v = menu.viewBox;

				v[0] -= (d3.event.dx * v[6]);
				v[1] -= (d3.event.dy * v[6]);

				updateViewbox(svg, menu);
			})
			.on('end', function(d){

			})
		);

		svg.call(d3.zoom()
			.on('start', function(d){

			})
			.on('zoom', function(d){

			})
			.on('end', function(d){

			})
		);

		resizeSvg(svg, menu);
	}

	function convertCellColourToHex(colour){
		return new NodeColour(Math.floor(colour.red * 255), Math.floor(colour.green * 255), Math.floor(colour.blue * 255));
	}

	function loadCategories(categories){
		var values = categories.rowData;

		for(var i = 1; i < values.length; ++i){
			var value = values[i].values;
			var colour = value[2] ? convertCellColourToHex(value[2].effectiveFormat.backgroundColor) : new NodeColour(255, 255, 255);
			var category = new Category(value[0].effectiveValue.numberValue, value[1].formattedValue, colour);
			this.addCategory(category);
		}
	}

	function loadTopics(topics){
		var values = topics.rowData;

		for(var i = 1; i < values.length; ++i){
			var value = values[i].values;
			var colour = value[3] ? convertCellColourToHex(value[3].effectiveFormat.backgroundColor) : new NodeColour(255, 255, 255);
			var topic = new Topic(value[0].effectiveValue.numberValue, value[1].formattedValue, colour);
			this.addTopic(topic, value[2].effectiveValue.numberValue);
		}
	}

	function loadCourses(courses){
		var values = courses.rowData;

		for(var i = 1; i < values.length; ++i){
			var value = values[i].values;
			var colour = value[7] ? convertCellColourToHex(value[7].effectiveFormat.backgroundColor) : new NodeColour(255, 255, 255);
			var course = new Course(value[0].formattedValue, value[1].formattedValue, value[2].formattedValue, value[3].formattedValue, value[4].formattedValue, value[5].formattedValue, colour);
			this.addCourse(course, value[6].effectiveValue.numberValue);
		}
	}

	Menu.prototype.init = function(containerPath){
		this.categories = [];
		this.courseList = [];
		this.config = new Config();
		this.loading = true;

		this.expanded = true;
		this.size = [0, 0];
		this.offset = [0, 0];
		this.viewBox = [0, 0, 0, 0, 0, 0, 1.0];

		this.containerPath = containerPath;
		addMouseCommands(this);

		// Read only computed properties
		Object.defineProperty(this, "name", {
			get: function() {
				return this.config.title;
			}
		});

		Object.defineProperty(this, "children", {
			get: function() {
				return this.categories;
			}
		});
	}

	Menu.prototype.loadFromServer = function(config, categories, topics, courses){
		this.config.loadFromServer(config);

		loadCategories.call(this, categories);
		loadTopics.call(this, topics);
		loadCourses.call(this, courses);
	}

	function calculateColour(parentColour, childColour){
		switch(this.config.blendMode.toLowerCase()){
			case 'subtract':
				return NodeColour.subtract(parentColour, childColour);

			case 'add':
				return NodeColour.add(parentColour, childColour);

			case 'multiply':
				return NodeColour.multiply(parentColour, childColour);
		}

		return childColour;
	}

	Menu.prototype.addCategory = function(category){
		this.categories.push(category);
	}

	Menu.prototype.addTopic = function(topic, categoryId){
		for(var i = 0; i < this.categories.length; ++i){
			if(this.categories[i].id == categoryId){
				topic.pathColour = calculateColour.call(this, this.categories[i].pathColour, topic.pathColour);
				this.categories[i].addTopic(topic);
				return;
			}
		}
	}

	Menu.prototype.addCourse = function(course, topicId){
		this.courseList.push(course);
		
		for(var i = 0; i < this.categories.length; ++i){
			var c = this.categories[i];

			for(var j = 0; j < c.children.length; ++j){
				if(c.children[j].id == topicId){
					course.pathColour = calculateColour.call(this, this.children[i].pathColour, course.pathColour);
					c.children[j].addCourse(course);
					return;
				}
			}
		}
	}

	Menu.prototype.printNodeTree = function(){
		for(var i = 0; i < this.categories.length; ++i){
			this.categories[i].print();
		}
	}

	/*
	** Visual updates
	*/
	Menu.prototype.updateAll = function(){
		var container = d3.selectAll(this.containerPath);
		var svg = container.selectAll("svg");

		resizeSvg(svg, this);
		this.updateDataModel();

		this.updateSidePanel(container.selectAll(".menu"));
		this.updateMap(svg);
	}

	function updateSidePanelChildren(data, div, elementType){
		var update = div.selectAll(".menu-item")
						.data(data.expanded ? data.children : []);

		var enter = update.enter()
					.append(elementType)
					.attrs(function(d){ return {"class": "menu-item " + d.getType().toLowerCase()}; })
					.each(function(d){
						var item = d3.select(this);

						item.append("div")
							.attr("class", "menu-title");

						item.append("ul");
					});

		var exit = update.exit().remove();

		var merged = update.merge(enter);

		merged.select(".menu-title")
			.styles(function(d){ return { "background-color": NodeColour.toHexString(d.pathColour) }; })
			.each(function(d){ 
				var t = d3.select(this);

				switch(d.getType().toLowerCase){
					default:
						t.text(d.name);
						break;
				}
			});

		merged.select("ul").each(function(d){
				if(d.children && d.expanded){
					updateSidePanelChildren(d, d3.select(this), "li")
				}
			})
	}

	Menu.prototype.updateSidePanel = function(menu){
		// Update the title
		menu.selectAll(".title-bar")
			.text(this.name);

		updateSidePanelChildren(this, menu, "div");
	}

	function updateDataModelLinear(data, isLeft){
		var height = 0;
		var width = DISTANCE_BETWEEN;

		if(!data.children || !data.expanded || data.children.length == 0){
			height = MIN_HEIGHT;
		}else{
			for(var i = 0; i < data.children.length; ++i){
				data.children[i].offset[0] = isLeft ? DISTANCE_BETWEEN : -DISTANCE_BETWEEN;
				data.children[i].offset[1] = height;

				var result = updateDataModelLinear(data.children[i], isLeft);
				width += result[0];
				height += result[1];
			}
		}

		data.size[0] = width;
		data.size[1] = height;

		return [width, height];
	}

	function updateDataModelRadial(data, minRadians, maxRadians, radius){
		var weightTotal = 0;
		var radPerWeight = 1.0;
		var halfRadPerWeight = 0.5;
		var currentRadMin = minRadians;
		var theta = 0.0;

		data.children.forEach(function(c){
			weightTotal += c.weight;
		});

		radPerWeight = (maxRadians - minRadians) / weightTotal;
		halfRadPerWeight = radPerWeight / 2.0;

		// Use the calculated weights to find the nodes radial location.
		for(var i = 0, n = data.children.length; i < n; ++i){
			var c = data.children[i];
			var weight = c.weight;

			theta = currentRadMin + ((radPerWeight * c.weight) / 2.0);

			c.offset[0] = radius * Math.cos(theta);
			c.offset[1] = radius * Math.sin(theta);

			updateDataModelRadial(c, currentRadMin, currentRadMin + (radPerWeight * c.weight), radius + DISTANCE_BETWEEN);

			currentRadMin += (radPerWeight * weight);
		}
	}

	function fixChildRadialOffsets(data, parentOffset){
		for(var i = 0, n = data.children.length; i < n; ++i){
			fixChildRadialOffsets(data.children[i], data.offset);
		}

		if(parentOffset){
			var p = data.path;

			data.offset[0] -= parentOffset[0];
			data.offset[1] -= parentOffset[1];
			p[0] = -data.offset[0];
			p[1] = -data.offset[1];
		}
	}

	function fixChildLinearOffsets(data, parentOffset){
		for(var i = 0, n = data.children.length; i < n; ++i){
			fixChildLinearOffsets(data.children[i], data.offset);
		}

		if(parentOffset){
			var p = data.path;

			//data.offset[0] -= parentOffset[0];
			//data.offset[1] -= parentOffset[1];
			//p[0] = -data.offset[0];
			//p[1] = -data.offset[1];
		}
	}

	Menu.prototype.updateDataModel = function(){
		switch(this.config.mapStyle){
			case 'Right':
				updateDataModelLinear(this, false);
				fixChildLinearOffsets(this, false);
				break;

			case 'Radial':
				updateDataModelRadial(this, 0.0, Math.PI * 2.0, DISTANCE_BETWEEN);
				fixChildRadialOffsets(this, false);
				break;

			default:
				updateDataModelLinear(this, true);
				fixChildLinearOffsets(this, false);
		}
	}

	function appendNodeDetails(data, menu){
		var type = data.getType();
		var g = d3.select(this);
		var addedItem;

		g.attr("transform", function(d){
			return "translate(" + d.offset[0] + "," + d.offset[1] + ")";
		});

		g.append("path");

		if(type == "Course"){
			addedItem = g.append("circle");
		}else{
			addedItem = g.append("rect");
		}

		addedItem.attr("class", "icon")
			.on("click", function(d, i){
				if(type == "Course"){
					//TODO: onCourseClick
				}

				d.expanded = !d.expanded;
				menu.updateAll();
			});

		g.append("g").attr("class", "text");
	}

	function getTextDim(text, minWidth, minHeight, maxWidth, maxHeight){
		var result = [minWidth, minHeight, minWidth >> 1, minHeight >> 1, text];

		// Loop through and add new lines if needed
		if(text.length > 8){
			result[0] = maxWidth;
			result[2] = maxWidth >> 1;
		}

		return result;
	}

	function updatePathAttributes(data){
		var type = data.getType().toLowerCase();
		var p = data.path;

		var result = {
			"stroke-width": PATH_WIDTH,
			"fill": "none",
			"stroke-linejoin": "bevel"
		}

		if(p){
			result["d"] = "M " + p[0] + " " + p[1] + " L " + p[2] + " " + p[3] + " L " + p[4] + " " + p[5];
			result["stroke"] = NodeColour.toHexString(data.pathColour)
		}

		return result;
	}

	function updateIconAttributes(data) {
		var type = data.getType().toLowerCase();
		var result = {
			"class": "icon " + type,
			"fill": "white",
			"stroke": "grey"
		}

		if(type == "course"){
			result["r"] = COURSE_RAD;
			result["tansform"] = "translate(0," + (data.size[1] >> 1) + ")";
		}else{
			result["rx"] = 10;
			result["ry"] = 10;

			var textDim = getTextDim(data.name, RECT_MIN_WIDTH, RECT_MIN_HEIGHT, RECT_MAX_WIDTH, RECT_MAX_HEIGHT);
			result["width"] = textDim[0];
			result["height"] = textDim[1];
			result["transform"] = "translate(" + (-textDim[2]) + "," + ((data.size[1] >> 1) - textDim[3]) + ")";
		}

		return result;
	}

	function addStringValuesToArray(array, string){
		//TODO: extend for new lines
		array.push(string);

		return array;
	}

	function getNodeLabel(data){
		var type = data.getType();

		var result = addStringValuesToArray([], data.name);

		if(type == "Course"){
			addStringValuesToArray(result, data.label);
		}

		return result;
	}

	function updateTextAttributes(data){
		var type = data.getType().toLowerCase();
		var result = {
			"class": "text " + type,
			"transform": null
		}

		var text = getNodeLabel(data);

		if(type == "course"){
			result["transform"] = "translate(" + COURSE_RAD + ", " + ((data.size[1] >> 1) - COURSE_RAD) + ") rotate(-45)";
		}else{
			var textDim = getTextDim(text, RECT_MIN_WIDTH, RECT_MIN_HEIGHT, RECT_MAX_WIDTH, RECT_MAX_HEIGHT);
			result["width"] = textDim[0];
			result["height"] = textDim[1];
			result["transform"] = "translate(0," + (data.size[1] >> 1) + ")";
		}

		return result;
	}

	function addStringValuesToArray(array, string){
		//TODO: extend for new lines
		array.push(string);

		return array;
	}

	function getNodeLabel(data){
		var type = data.getType();

		var result = addStringValuesToArray([], data.name);

		if(type == "Course"){
			addStringValuesToArray(result, data.label);
		}

		return result;
	}

	function updateData(data, parent, menu) {
		// Update each Category		
		var update = parent.selectAll(function(){
			var children = Array.prototype.filter.call(this.children, function(child){
				return child.tagName == "g" && child.classList.contains("node");
			});

			return children;
		}).data(data);

		var enter = update.enter()
					.append("g")
					.attr("class", "node")
					.each(function(d){
						appendNodeDetails.call(this, d, menu);
					});

		enter.raise();

		var exit = update.exit().remove();

		var merged = update.merge(enter);

		merged.select(".menu-title")
			.text(function(d){ return d.name; });

		// Update children
		merged.transition().on('end', function(d){
			var g = d3.select(this);

			g.selectAll("g.text")
				.attrs(updateTextAttributes)
				.selectAll("text")
				.data(getNodeLabel)
				.text(function(d){ return d; })
				.enter()
				.append('text')
				.attr('x', function(d, i, e){ 
					var w = parseInt(e[0].parentNode.getAttribute("width"));
					if(isNaN(w)){
						w = 0;
					}

					return "-" + w + "px"; 
				})
				.attr('y', function(d, i){ return (i * FONT_HEIGHT) + "px"; })
				.text(function(d){ return d })
				.exit()
				.remove();

			g.selectAll(".icon").attrs(updateIconAttributes)

			g.selectAll("path").attrs(updatePathAttributes);

			var icon = g.selectAll(".icon").remove();
			var text = g.selectAll("g.text").remove();

			merged.each(function(d){
				if(d.expanded){
					updateData(d.children, d3.select(this), menu);
				}else{
					d3.select(this).selectAll("g.node").remove();
				}
			});

			if(!icon.empty()){
				g.append(function(){
					return icon.node();
				});

				g.append(function(){
					return text.node();
				});
			}

		}).attr("transform", function(d){
			return "translate(" + d.offset[0] + "," + d.offset[1] + ")";
		});
	}

	Menu.prototype.updateMap = function(svg){
		updateData([this], svg, this);
	}
}

var Node = GenerateObject("Node", null);
{

	Node.prototype.init = function(id, name, colour){
		this.id = id;
		this.name = name;
		this.children = [];
		this.offset = [0.0, 0.0];
		this.size = [0, 0];
		this.path = [0, 0, 0, 0, 0, 0]; // starting point, diagonal line, straight line.
		this.parent = null;
		this.pathColour = colour;
		this.expanded = true;

		// Read only computed properties
		Object.defineProperty(this, "weight", {
			get: function() {
				var weight = 1;
				for(var i = 0; i < this.children.length; ++i){
					weight += this.children[i].weight;
				}
				
				return weight;
			}
		});

	}

	Node.prototype.print = function(baseName){
		var outString = baseName ? baseName + " > " : "";
		outString += this.name;

		if(this.children.length > 0){
			for(var i = 0; i < this.children.length; ++i){
				this.children[i].print(outString);
			}
		}else{
			console.log(outString);
		}
	}
}

var Category = GenerateObject("Category", Node);
{
	Category.prototype.init = function(id, name, colour){
		Node.prototype.init.call(this, id, name, colour);
	}

	Category.prototype.addTopic = function(topic){
		this.children.push(topic);
	}
}

var Topic = GenerateObject("Topic", Node);
{
	Topic.prototype.init = function(id, name, colour){
		Node.prototype.init.call(this, id, name, colour);
	}

	Topic.prototype.addCourse = function(course){
		this.children.push(course);
	}
}

var Course = GenerateObject("Course", Node);
{
	Course.prototype.init = function(id, name, subtitle, prereqs, coreqs, description, colour){
		Node.prototype.init.call(this, id, name, colour);


	}
}