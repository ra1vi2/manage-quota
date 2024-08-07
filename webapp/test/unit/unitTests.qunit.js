/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"vwksnlps2pmm/mng.quota/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
