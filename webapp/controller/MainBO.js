sap.ui.define([
    "../utils/Utility",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Input",
    "sap/ui/core/ValueState",
    "vwks/nlp/s2p/mm/mng/quota/utils/Constants"
], function ( Utility, Filter, FilterOperator, ColumnListItem, Text, Input, ValueState, Constants) {
    "use strict";
    return {
        /**
         * Method to get date value to be used as guid in odata
         * @returns {string} Returns date in ISO String format
         */
        generateUUID: function () {
            return new Date().toISOString();
        },
        /**
         * Method call on for edit press event
         * @param {Object} oSelectedQuotaObject Selected Object from Quota Table
         * @param {sap.ui.model.odata.v2.ODataModel} oModel OData default model
         * @returns {jQuery.Deferred.Promise} Promise to call odata function import
         */
        handleEditPress: function (oSelectedQuotaObject, oModel) {
            var oParam = {
                method: "POST",
                urlParameters: {
                    "FormatedCode": oSelectedQuotaObject.FormatedCode
                }
            };
            return this.callFunctionImport(oModel, "EditQuota", oParam);
        },
        /**
         * Method call on for edit press event
         * @param {String} sEditID Session ID value to be added in URL
         * @param {sap.ui.model.odata.v2.ODataModel} oModel oModel OData default model
         * @param {Boolean} bGoClicked Is Go button pressed 
         * @returns {jQuery.Deferred.Promise} Promise to call odata function import
         */
        handleCancelEditPress: function (sEditID, oModel, bGoClicked) {
            if (!bGoClicked) {
                return this.callFunctionImport(oModel, "DiscardChange", this._getUrlParametersWithCancelValue(sEditID, true));
            } else {
                return this.callFunctionImport(oModel, "DiscardChange", this._getUrlParametersWithCancelValue(sEditID, false));
            }
        },
        /**
         * Method call on for save press event
         * @param {string} sEditID Session ID value to be added in URL
         * @param {sap.ui.model.odata.v2.ODataModel} oModel oModel OData default model
         * @returns {jQuery.Deferred.Promise} Promise to call odata function import
         */
        handleSavePress: function (sEditID, oModel) {
            return this.callFunctionImport(oModel, "SaveQuota", this._getUrlParametersWithEditId(sEditID));
        },
        /**
         * Handle Quota Number Update
         * @param {sap.ui.model.odata.v2.ODataModel} oModel oModel OData default model
         * @param {Object} oData oData Payload
         * @returns {jQuery.Deferred.Promise} Promise to call odata update
         */
        handleQuotaNumberUpdate: function (oModel, oData) {
            // return this.updateODataCall(oModel, "xVWKSxNLP_INTG_C_TREE_QUOTA", oData);
            var sRequestUri = encodeURIComponent("xVWKSxNLP_INTG_C_TREE_QUOTA(FormatedCode='" + oData.FormatedCode + "')");
            oData.QuotaNumber = parseInt(oData.QuotaNumber, 10);
            return this.updateODataCall(oModel, sRequestUri, oData);
        },
        /**
         * Prepare payload for Add Quota Save 
         * @param {Object} oAddQuotaHeaderData Add Quota Popup Header Data
         * @param {Object} oAddQuotaContractsTable Add Quota Popup Contract Data
         * @param {Object} oSelectedObject Selected quota object
         * @returns {Array} aData Payload for add quota call
         */
        prepareAddQuotaData: function (oAddQuotaHeaderData, oAddQuotaContractsTable, oSelectedObject) {
            var aData = [];
            aData.push({
                Material: oAddQuotaHeaderData.Material,
                FormatedCode: oAddQuotaHeaderData.FormatedCode,
                UseCurrentQuota: oAddQuotaHeaderData.UseCurrentQuota || false,
                QuotaValidityFrom: oAddQuotaHeaderData.ValidityFrom,
                QuotaValidityTo: oAddQuotaHeaderData.ValidityTo,
                DocumentType: oSelectedObject.DocumentType,
                DocumentDisplayData: "",
                QuotaNumber: 0
            });

            var aItems = oAddQuotaContractsTable.getItems();
            aItems.forEach(function (oItem) {
                var oData = oItem.getBindingContext().getProperty();
                if (oData.QuotaNumber && oData.QuotaNumber > 0) {
                    aData.push({
                        DocumentDisplayData: oData.DocumentDisplayData,
                        QuotaNumber: oData.QuotaNumber
                    });
                }
            });
            return aData;
        },
        /**
         * Validate add quota dialog fields
         * @param {sap.ui.core.mvc.View} oView SAP UI View
         * @param {Object} oAddQuotaHeaderData Add quota popup data
         * @returns {boolean} returns boolean value based on validationg the Validity From and Validity To values 
         */
        validateDialogData: function (oView, oAddQuotaHeaderData) {
            if (!oAddQuotaHeaderData.ValidityFrom) {
                oView.byId("idAddQuotaValidityFrom").setValueState(ValueState.Error);
                return false;
            }
            if (!oAddQuotaHeaderData.ValidityTo) {
                oView.byId("idAddQuotaValidityTo").setValueState(ValueState.Error);
                return false;
            }
            return true;

        },
        /**
         * Load Quota Dialog Header data
         * @param {sap.ui.model.odata.v2.ODataModel} oModel OData default model 
         * @param {Object} oSelectedObject Selected Quota Object
         * @returns {jQuery.Deferred.Promise} Promise to call odata function import
         */
        loadAddQuotaDialogData: function (oModel, oSelectedObject) {
            var oParam = {
                method: "GET",
                urlParameters: {
                    "FormatedCode": oSelectedObject.FormatedCode
                }
            };
            return this.callFunctionImport(oModel, "GetAddPopUpInfo", oParam);
        },
        /**
         * Load quota dialog contract data
         * @param {Object} oTable Add Quota Popup Table
         * @param {Object} oSelectedObject Quota Selected Object
         */
        loadAddQuotaDialogContractData: function (oTable, oSelectedObject) {
            var aFilter = [];
            aFilter.push(new Filter("Material", FilterOperator.EQ, oSelectedObject.Material));
            aFilter.push(new Filter("DocumentType", FilterOperator.EQ, oSelectedObject.DocumentType));
            aFilter.push(new Filter("FormatedCode", FilterOperator.EQ, oSelectedObject.FormatedCode));

            var oItem = new ColumnListItem({
                cells: this.getAddQuotaColumns().map(function (column) {
                    if (column.template === Constants.PROPERTIES.QUOTANUMBER) {
                        return new Input({
                            value: "{" + column.template + "}"
                        });
                    } else {
                        return new Text({
                            text: "{" + column.template + "}"
                        });
                    }
                })
            });

            oTable.bindAggregation("items", {
                path: "/xVWKSxNLP_INTG_C_TREE_QUOTA",
                filters: aFilter,
                parameters: {
                    select: Constants.PROPERTIES.ADD_QUOTA_SELECT
                },
                template: oItem
            });
            oTable.getModel().resetChanges();
        },
        /**
         * method to get template for the add quota contracts table
         * @returns {array} returns template for the add quota contracts table
         */
        getAddQuotaColumns: function () {
            return [
                {
                    "template": "parts: [ 'DocumentDisplayData' , 'SupplierNo', 'SupplierName' ]"
                },
                {
                    "template": "QuotaNumber"
                }
            ];
        },
        /**
         *  prepare filter array for supplier quota dialog smart table
         * @param {array} aSelectedMaterials Array of selected materials
         * @param {object} oSelectedQuotaObject Selected quota row object
         * @returns {sap.ui.model.Filter[]} Supplier quota filters
         */
        getSupplierQuotaFilters: function (aSelectedMaterials, oSelectedQuotaObject) {
            var aFilters = [];
            aSelectedMaterials.forEach(function (sMaterial) {
                aFilters.push(new Filter("Material", FilterOperator.EQ, sMaterial));
            });
            aFilters.push(new Filter("DocumentType", FilterOperator.EQ, oSelectedQuotaObject.DocumentType));
            return aFilters;
        },
        /**
         * method to fetch supplier quota details
         * @param {sap.ui.model.odata.v2.ODataModel} oModel OData default model 
         * @param {Array} aSelectedMaterials Array of selected materials
         * @param {Object} oSelectedQuotaObject  Selected quota row object
         * @returns {jQuery.Deferred.Promise} Promise to call odata read call
         */
        getSupplierQuotaDetails: function (oModel, aSelectedMaterials, oSelectedQuotaObject) {
            var aFilters = this.getSupplierQuotaFilters(aSelectedMaterials, oSelectedQuotaObject);
            return this.readOdataCall(oModel, "SupplierQuotaAggregateSet", {
                filters: aFilters
            });
        },
        /**
         * Utility method to read odata call
         * @param {sap.ui.model.odata.v2.ODataModel} oModel Odata Model reference
         * @param {String} sPath odata request path
         * @param {Object} mParameters parameters map
         * @returns {jQuery.Deferred.Promise} Promise to call odata read
         */
        readOdataCall: function (oModel, sPath, mParameters) {
            return Utility.odataRead(oModel, sPath, mParameters);
        },
        /**
         * 
         * @param {sap.ui.model.odata.v2.ODataModel} oModel OData default model
         * @param {String} sPath Selected Quota row context path
         * @param {Object} mParameters Function import parameters
         * @returns {jQuery.Deferred.Promise} Promise to call odata function import
         */
        callFunctionImport: function (oModel, sPath, mParameters) {
            return Utility.odataCallFunction(oModel, sPath, mParameters);
        },
        /**
         * 
         * @param {sap.ui.model.odata.v2.ODataModel} oODataModel - Odata Model reference
         * @param {String} sEntitySet OData Entity Set
         * @param {Object} oUpdatedData Updated Data
         * @param {Object} mParameters Function import parameters
         * @returns {jQuery.Deferred.Promise} Promise to call odata update
         */
        updateODataCall: function (oODataModel, sEntitySet, oUpdatedData, mParameters) {
            return Utility.odataUpdate(oODataModel, sEntitySet, oUpdatedData, mParameters);
        },
        /**
         * method get URLparameters with Session Id as attribute
         * @param {String} sEditID Session ID string value
         * @returns {Object} object for odata parameters payload
         */
        _getUrlParametersWithEditId: function (sEditID) {
            return {
                method: "POST",
                urlParameters: {
                    "SessionID": sEditID
                }
            };
        },
        /**
         * method get URLparameters with Session Id and Cancel as attribute
         * @param {String} sEditID Session ID string value
         * @param {Boolean} bIsCancel Boolean to determine if this cancel call
         * @returns {Object} object for odata parameters payload
         */
        _getUrlParametersWithCancelValue: function (sEditID, bIsCancel) {
            return {
                method: "POST",
                urlParameters: {
                    "SessionID": sEditID,
                    "IsCancel": bIsCancel
                }
            };
        }
    };
});

