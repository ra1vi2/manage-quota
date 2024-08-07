sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "vwks/nlp/s2p/mm/mng/quota/model/models",
    "sap/ui/model/json/JSONModel"
],
    function (UIComponent, Device, models, JSONModel) {
        "use strict";

        return UIComponent.extend("vwks.nlp.s2p.mm.mng.quota.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                if (this.getComponentData()) {
                    sap.ui.getCore().setModel(new JSONModel(this.getComponentData().startupParameters), "startParam");
                }
            }
        });
    }
);