function get_input(ele, callbk) {
	if (ele.is(":button")) {
		// skip
	} else if (ele.prop("type") == 'submit') {
		// skip
	} else if (ele.prop("type") == 'reset') {
		// skip
	} else if (ele.prop("type") == 'hidden') {
		// skip
	} else if (ele.prop("type") == 'image') {
		// skip
	} else if (ele.prop("type") == 'file') {
		// skip
	} else {
		name = ele.prop("name").toLowerCase();
		type = ele.prop("type");
		position = ele.offset().top;

		// get original ID either by previously saved attr
		// OR by ID attr if no tk_orig_id attr presents.
		id = '';
		if (ele.attr("tk_orig_id") != undefined) {
			id = ele.attr("tk_orig_id");
			// console.log('get ID from saved attr...');
		} else if (ele.attr("id")) {
			id = ele.attr("id").toLowerCase();
		}

		// save original ID
		ele.attr('tk_orig_id', id);

		ele.uniqueId();
		ref_id = ele.attr("id");

		form_id = '';
		var form = ele[0].form;
		if ($(form).attr("id"))
			form_id = $(form).attr('id');

		key = ref_id;

		input_val = '';
		if (ele.is(':radio') || ele.is(':checkbox')) {
			name += '/' + ele.val();

			if (ele.is(':checked'))
				input_val = 'checked';
		} else {
			input_val = ele.val();
			if (input_val == undefined)
				input_val = '';
		}

		host = $(location).attr('host');

		value = {
			"name": name,
			"type": type,
			"value": input_val,
			"host": host,
			"id": id,
			"ref_id": ref_id,
			"form_id": form_id,
			"position": position 
		};

		callbk(key, value);
	}
}

function get_inputs_we_care(callbk) {
	var care_inputs = {};
	var allInputs = $(":input");
	allInputs.each( function (index) {
		get_input($(this), function (key, value) {
			care_inputs[key] = value;
		});
	});

	/* return results */
	callbk(care_inputs);
}

function print_js_array(title, array) {
	console.log('[Javascript array] ' + title + ':');
	for (var ele of array) {
		console.log(JSON.stringify(ele));
	}
}

function print_js_object(title, object) {
	console.log('[Javascript object] ' + title + ':');
	for (var key in object) {
		if (object.hasOwnProperty(key)) {
			console.log(key + ':');
			console.log('\t' + JSON.stringify(object[key]));
		}
	}
}

function size_object(obj) {
	var key, size = 0;
	for (key in obj) {
		if (obj.hasOwnProperty(key))
			size ++;
	}
	return size;
}

function set_input_value(dom_ele, value) {
	if (dom_ele.is(':radio') || dom_ele.is(':checkbox')) {
		if (value == 'checked') {		
			dom_ele.prop('checked', true);
		} else {
			dom_ele.prop('checked', false);
		}
	} else {
		dom_ele.val(value);
	}
}

function get_dom_ele_by_id(ele_id, callbk) {
	var ele = $(document.getElementById(ele_id));
	/* $("#" + id) is not safe, since id might be "foo:bar:baz" */

	if (ele.length > 0) {
		callbk(ele);
		return;
	}

//	/* search in iframes */
//	$('iframe').each(function () {
//		iframe_url = $(this).get(0).contentWindow.document.origin;
//		iframe_id = $(this).attr('id');
//		console.log('search in iframe#' + iframe_id + ' -> ' + iframe_url);
//		if (testSameOrigin(iframe_url)) {
//			ele = $(document.getElementById(ele_id), $(this).contents());
//			if (ele.length > 0) {
//				callbk(ele);
//				return false; /* break out `each' loop */
//			}
//		}
//	});
}

$(document).ready(function() {
	chrome.runtime.onMessage.addListener(function(msg, sender, response_fun) {
		if (msg.my_request == 'search_forms_in_this_page') {
			console.log('received search request...');

			get_inputs_we_care(function (care_inputs) {
				var inputs = care_inputs;
				var lenObj = size_object(inputs);
				var frame_origin = document.origin;

				if (lenObj != 0) {
					print_js_object('response', inputs);
					chrome.runtime.sendMessage({
						"my_response": inputs,
						"frame_origin": frame_origin,
						"action": msg.action
					});
				}
			});
		} else if (msg.my_request == 'fill_one_blank_in_this_page') {
			var value = '' + msg.value;
			if (msg.value == '')
				value = '"empty"';
				
			console.log('fill ' + msg.key + ' with value ' + value);
			get_dom_ele_by_id(msg.key, function (dom_ele) {
				set_input_value(dom_ele, msg.value);

				if (msg.if_remember) {
					$('html,body').animate({
						scrollTop: $(dom_ele).offset().top
					}, 'fast');

					get_input(dom_ele, function (key, value) {
						response = {'key': key, 'value': value};
						console.log('send request to remember %o.', response);
						response_fun(response);
					});
				}
			});
		}
	});

	console.log('content document ready.');
});
