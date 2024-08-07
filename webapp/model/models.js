sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
    function (JSONModel, Device) {
        "use strict";

        return {
            /**
             * method to return device model
             * @returns {sap.ui.model.json.JSONModel} oModel Device Model
             */
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
        }
    };
});