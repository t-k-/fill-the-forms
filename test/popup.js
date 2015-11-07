test_dat = {
	'aformid/firstname#': [
		{"name":"firstname",
		"type":"text",
		"value":"Mickey",
		"id":"",
		"host":"example.com",
		"form_id":"aformid"
		},
		{"name":"firstname",
		"type":"text",
		"value":"Wei",
		"id":"",
		"host":"qq.com",
		"form_id":"submit"
		},
		{"name":"firstname",
		"type":"text",
		"value":"Wanzhu",
		"id":"",
		"host":"sohu.com",
		"form_id":"login"
		}
	],
	'aformid/Check#': [{
		"name":"sex",
		"type":"radio",
		"value":"",
		"id":"",
		"host":"127.0.0.1",
		"form_id":"aformid"
	}]
};

var myapp = angular.module('myapp', ["xeditable"]);

myapp.run(function(editableOptions) {
	editableOptions.theme = 'bs3';
});

myapp.controller('MyCtrl', function ($scope) {
	$scope.test = 'hello';
	$scope.mylist = test_dat;
	$scope.dele = function (key, row) {
		// alert('delete: key,row = ' + key + ',' + row);
		$scope.mylist[key].splice(row, 1);
	};

	$scope.apply = function (key, row) {
		alert('apply: key,row = ' + key + ',' + row);
	};
});

$(document).ready(function () {
	//console.log(test_dat);
	angular.bootstrap(document, ['myapp']);
});
