/*
test_row = [
	{"name":"firstname",
	"type":"text",
	"value":"Mickey",
	"host":"example.com",
	"id":"12",
	"form_id":"302"
	},
	{"name":"firstname",
	"type":"text",
	"value":"Wei",
	"id":"32",
	"host":"qq.com",
	"form_id":"submit"
	},
	{"name":"firstname",
	"type":"text",
	"value":"tear",
	"id":"21029",
	"host":"sohu.com",
	"form_id":"login"
	}
];

test_dat = {'aformid/firstname#': test_row};
*/

function hash_obj(obj) {
	return md5(
		obj.value +
		obj.name +
		obj.type +
		obj.host +
		obj.id +
		obj.form_id
	);
}

function relevance(query, item) {
	var sum = 0;
	var matches = [];

	if (item.type != query.type)
		return {'score': sum, 'matches': ['type mismatch']};

	/* query.prop is typically longer than that of item */
	if (-1 != query.name.indexOf(item.name) &&
	    item.name != '') {
		if (query.name == item.name)
			sum += 1;
		else
			sum += 0.9;

		matches.push('name');
	}
	if (-1 != query.id.indexOf(item.id) &&
	    item.id != '') {
		if (query.id == item.id)
			sum += 1;
		else
			sum += 0.9;

		matches.push('id');
	}

	/* less important */
	if (item.form_id == query.form_id &&
	    item.form_id != '') {
		sum += 0.4;
		matches.push('form_id');
	}
	if (item.host == query.host && 
	    item.host != '') {
		sum += 0.4;
		matches.push('host');
	}

	return {'score': sum, 'matches': matches};
}

function search_one(query, ret_callbk) {
	var ret_results = [];

	chrome.storage.local.get(null, function (items) {
		for (var key in items)
			if (items.hasOwnProperty(key)) {
				var item = items[key];
				var res = relevance(query, item);
				var score = res['score'];
				if (score > 0) {
					item['store_key'] = key;
					item['score'] = score;
					item['matches'] = res['matches'];
					ret_results.push(item);
				}
			}

		ret_results.sort(function (a,b) {
			return b.score - a.score;
		});

		ret_results = ret_results.slice(0, 3);

		ret_callbk(ret_results);
	});
}

function search_all(all_query, if_save, ret_callbk) {
	/* if_save:
	 *    0: does not save any new records at all;
	 *    1: save every records (including empty values) of forms.
	 */

	/* step 1: store all non-empty values */
	if (if_save) {
		for (var ref_id in all_query) {
			if (all_query.hasOwnProperty(ref_id)) {
				var query = all_query[ref_id];
				var cur_val = query['value'];

				store_key = hash_obj(query);
				store_item = {};
				store_item[store_key] = query;

				console.log('save:');
				console.log(store_item);
				chrome.storage.local.set(store_item);
			}
		}
	}

	/* step 2: search and refresh each candidate value */
	setTimeout(function () {
		for (var ref_id in all_query) {
			if (all_query.hasOwnProperty(ref_id)) {
				var query = all_query[ref_id];
				var cur_val = query['value'];
				(function (x, q) {
					search_one(q, function (res_val) {
						ret_callbk(x, res_val);
					});
				})(ref_id, query);
			}
		}
	}, 300);
}

var myapp = angular.module('myapp', []);

myapp.filter('orderObjectBy', function() {
	return function(items, field, reverse) {
		var filtered = [];
		angular.forEach(items, function(item) {
				filtered.push(item);
		});
		filtered.sort(function (a, b) {
				return (a[field] > b[field] ? 1 : -1);
		});
		if(reverse) filtered.reverse();
		return filtered;
	};
});

myapp.directive('myEvalHook', function ($timeout) {
	return {
		restrict: 'A',
		scope: {
			text:"@myKey",
			text:"@myRow"
		}
	}
});

myapp.directive('myRenderHook', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attr) {
			if (scope.$last === true) {
				$timeout(function () {
					scope.$emit('myRenderFinish');
				}, 1);
			}
		}
	}
});

myapp.controller('MyCtrl', function ($scope) {
	$scope.results = {};
	$scope.inputs = {};
	$scope.empty_inputs = true;
	$scope.srch_results = {};
	$scope.empty_srch_results = true;

	$scope.search_val_clicked = function () {
		var query = $('#q').val();
		$scope.search_val(query);
		$("#q").effect("highlight", {}, 800);
	};

	$('#q').bind("enterKey",function(e){
		var query = $('#q').val();
		$scope.search_val(query);
		$("#q").effect("highlight", {}, 800);
	});
	$('#q').keyup(function(e){
		if(e.keyCode == 13)
			$(this).trigger("enterKey");
	});

	$scope.search_apply = function (val) {
		console.log('search apply: ' + val);
		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id,
				{
					'my_request': 'fill_focus_with_value', 
					'value': val
				}
			);
		});
	}

	$scope.search_val = function (query) {
		$scope.srch_results = {};
		var srch_results_len = 0;
		console.log('search value: ' + query);

		chrome.storage.local.get(null, function (items) {
			for (var key in items)
				if (items.hasOwnProperty(key) && srch_results_len < 3) {
					var item = items[key];
					var val = item['value'];
					if (item['type'] != 'text' && 
					    item['type'] != 'textarea' &&
					    item['type'] != 'password')
						continue;
					if (!$scope.srch_results.hasOwnProperty(val)) {
						if (-1 != val.indexOf(query)) {
							$scope.$apply(function () {
							/* encapsulated in an apply function to force
							 * view to be updated 
							 */
								$scope.srch_results[val] = key;
								$scope.empty_srch_results = false;
							});
							srch_results_len ++;
						}
					}
				}

			if (jQuery.isEmptyObject($scope.srch_results))
				$scope.$apply(function () {
					$scope.empty_srch_results = true;
				});
		});
	};

	$scope.$on('myRenderFinish', function (e) {
		$('.hook').each(function () {
			var key = $(this).attr("my-key");
			var row = $(this).attr("my-row");
			var att = $(this).attr("my-attr");

			$(this).children('.editable').editable({
				'success': function (response, newVal) {
					var res_item = $scope.results[key][row];
					var old_k = res_item['store_key'];

					//hash_obj(query);
					chrome.storage.local.get(old_k, function (item) {
						query = item[old_k];
						query[att] = newVal;
						var store_key = hash_obj(query);
						var store_item = {};
						store_item[store_key] = query;

						console.log('save:');
						console.log(store_item);
						chrome.storage.local.set(store_item, function () {
							chrome.storage.local.remove(old_k, function () {
								search_all($scope.inputs, 0, function (i, v) {
									$scope.$apply(function () {
									/* encapsulated in an apply function to force
									 * view to be updated 
									 */
										$scope.results[i] = v;
									});
								});
							});
						});
					});
				}
			});
		});
	});

	$scope.forget = function (key, row) {
		var res_item = $scope.results[key][row];
		var store_key = res_item['store_key'];

		chrome.storage.local.remove(store_key, function () {
			/* Because one search result can present at another query,
			 * we need to update the view of all results. */
			search_all($scope.inputs, 0, function (ref_id, res_val) {
				$scope.$apply(function () {
				/* encapsulated in an apply function to force
				 * view to be updated 
				 */
					$scope.results[ref_id] = res_val;
				});
			});
		});
	};

	$scope.forget_all = function () {
		chrome.storage.local.clear(function () {
			search_all($scope.inputs, 0, function (ref_id, res_val) {
				$scope.$apply(function () {
				/* encapsulated in an apply function to force
				 * view to be updated 
				 */
					$scope.results[ref_id] = res_val;
				});
			});
		});
	};

	function fill_one_request_callbk(response) {
		var key = response['key'];
		var query = response['value'];
		var store_key = hash_obj(query);
		var store_item = {};
		store_item[store_key] = query;

		(function (x,q,s) {
			console.log('save:');
			console.log(s);
			chrome.storage.local.set(s, function () {
				search_one(q, function (ret_results) {
					$scope.$apply(function () {
						$scope.results[x] = ret_results;
					});
				});
			});
		})(key, query, store_item);
	}

	$scope.apply_one = function (key, row, if_remember) {
		//alert('apply: key,row = ' + key + ',' + row);
		var res_item = $scope.results[key][row];
		var arg_callbk = function () {};

		console.log('apply and if_remember=' + if_remember);
		if (if_remember)
			arg_callbk = fill_one_request_callbk;

		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id,
				{
					my_request: 'fill_one_blank_in_this_page',
					'key': key,
					'value': res_item['value'],
					'if_remember': if_remember,
				}, arg_callbk
			);
		});
	};

	$scope.apply_all = function () {
		for (var key in $scope.results)
			if ($scope.results.hasOwnProperty(key) &&
			    $scope.results[key].length > 0) {
				$scope.apply_one(key, 0, 0);
			}
	};

	$scope.typical_form = function () {
		chrome.tabs.create({url:"http://xue-zha.club/job.html"});
	};

	$scope.link_to_storage_explorer = function () {
		chrome.tabs.create({url:"https://chrome.google.com/webstore/detail/storage-area-explorer/ocfjjjjhkpapocigimmppepjgfdecjkb"});
	};

	$scope.remember_all = function () {
		console.log('send remember request to content...');
		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id,
				{
					'my_request': 'search_forms_in_this_page', 
					'action': 'search_and_remember'
				}
			);
		});
	};

	function search_and_show_results(inputs, if_remember) {
		search_all(inputs, if_remember, function (ref_id, res_val) {
			$scope.$apply(function () {
			/* encapsulated in an apply function to force
			 * view to be updated 
			 */
				$scope.results[ref_id] = res_val;
			});
		});

		$scope.$apply(function () {
			$scope.inputs = inputs;
		});
	}

	/* send a msg to current tab content.js */
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		console.log('send msg to content script(s) in all frames...');

		/* clear $scope.inputs */
		$scope.inputs = {};

		chrome.tabs.sendMessage(
			tabs[0].id,
			{
				'my_request': 'search_forms_in_this_page', 
				'action': 'only_search'
			}
		);
	});

	chrome.runtime.onMessage.addListener(function(msg, sender, response_fun) {
		console.log("Received %o from %o, frame %o (%o)", 
		            msg, sender.tab, sender.frameId, msg.frame_origin);

		/* know if content has a focus or not */
		$scope.$apply(function () {
			$scope.if_focus = msg.if_focus;
		});

		/* concatenate query inputs into $scope.inputs */
		for (var key in msg.my_response)
			if (msg.my_response.hasOwnProperty(key)) {
				$scope.$apply(function () {
					$scope.inputs[key] = msg.my_response[key];
					$scope.empty_inputs = false;
				});
			}
		
		if (jQuery.isEmptyObject($scope.inputs)) {
			$scope.$apply(function () {
				$scope.empty_inputs = true;
			});
		}
	
		
		if (msg.action == 'only_search') {
			search_and_show_results($scope.inputs, 0);
		} else if (msg.action == 'search_and_remember') {
			search_and_show_results($scope.inputs, 1);
		}
	});
});

$(document).ready(function () {
	angular.bootstrap(document, ['myapp']);
	console.log('document ready');
	$('#q').focus();
});
