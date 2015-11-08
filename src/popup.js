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
	if (-1 != query.name.search(item.name) &&
	    query.name != '') {
		sum += 1;
		matches.push('name');
	}
	if (item.host == query.host && 
	    item.host != '') {
		sum += 1;
		matches.push('host');
	}
	if (-1 != query.id.search(item.id) &&
	    query.id != '') {
		sum += 1;
		matches.push('id');
	}
	if (item.form_id == query.form_id &&
	    item.host != '') {
		sum += 1;
		matches.push('form_id');
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

					//$scope.$apply(function () {
					/* encapsulated in an apply function to force
					 * view to be updated.
					 */
						//$scope.results[ref_id] = res_val;
					//});
				}
			});
		});
	});

	$scope.results = {};
	$scope.inputs = {};
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
			chrome.storage.local.set(s, function () {
				search_one(q, function (ret_results) {
					$scope.$apply(function () {
						$scope.results[x] = ret_results;
					});
				});
			});
		})(key, query, store_item);
	}

	$scope.apply_one = function (key, row) {
		//alert('apply: key,row = ' + key + ',' + row);
		var res_item = $scope.results[key][row];
		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id,
				{
					my_request: 'fill_one_blank_in_this_page',
					'key': key,
					'value': res_item['value']
				},
				fill_one_request_callbk
			);
		});
	};

	$scope.apply_all = function () {
		for (var key in $scope.results)
			if ($scope.results.hasOwnProperty(key) &&
			    $scope.results[key].length > 0) {
				$scope.apply_one(key, 0);	
			}
	};

	function search_request_callbk_remember_all(inputs) {
		console.log('got response from content...');
		console.log(inputs);
		console.log('============================');

		search_all(inputs, 1, function (ref_id, res_val) {
			$scope.$apply(function () {
			/* encapsulated in an apply function to force
			 * view to be updated 
			 */
				$scope.results[ref_id] = res_val;
				$scope.inputs = inputs;
			});
		});
	}

	$scope.remember_all = function () {
		console.log('send remember request to content...');
		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id,
				{my_request: 'search_forms_in_this_page'},
				search_request_callbk_remember_all
			);
		});
	}

	function search_request_callbk(inputs) {
		console.log('got response from content...');
		console.log(inputs);
		console.log('============================');

		search_all(inputs, 0, function (ref_id, res_val) {
			$scope.$apply(function () {
			/* encapsulated in an apply function to force
			 * view to be updated 
			 */
				$scope.results[ref_id] = res_val;
				$scope.inputs = inputs;
			});
		});
	}

	/* send a msg to current tab content.js */
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		console.log('send msg to content...');

		chrome.tabs.sendMessage(
			tabs[0].id,
			{my_request: 'search_forms_in_this_page'},
			search_request_callbk
		);
	});

});

$(document).ready(function () {
	angular.bootstrap(document, ['myapp']);
	console.log('document ready');
});
