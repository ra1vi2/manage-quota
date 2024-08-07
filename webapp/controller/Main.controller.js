sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "vwks/nlp/s2p/mm/mng/quota/utils/Constants",
    "./MainBO",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "vwks/nlp/s2p/mm/reuse/lib/util/Constants",
    "vwks/nlp/s2p/mm/reuse/lib/util/NavigationHelper",
    "sap/ui/core/ValueState",
    "vwks/nlp/s2p/mm/mng/quota/utils/ReuseMessageBox"
],
    /* eslint-disable max-params */
    function (Controller, JSONModel, MessageBox, Constants, BO, BusyIndicator, MessageToast
        , ReuseConstants, NavigationHelper, ValueState, ReuseMessageBox
    ) {
        "use strict";
        return Controller.extend("vwks.nlp.s2p.mm.mng.quota.controller.Main", {
            onInit: function () {
                this.initModel();
                var oi18nModel = this.getView().getController().getOwnerComponent().getModel("i18n");
                if (oi18nModel) {
                    this._oResourceBundle = oi18nModel.getResourceBundle();
                }
                this._oTreeTable = this.byId("idCustomTable");
                this.oSmartTable = this.byId("idQuotaSmartTable");

                this.aSelectedMaterials = [];

                if (this.oSmartTable.isInitialised()) {
                    this.changeTableAutoBinding();
                } else {
                    this.oSmartTable.attachInitialise(this.getView().getModel(), this.changeTableAutoBinding(), this);
                }
                this._applyRoutingDefaultFilters();
                var oModel = this.getOwnerComponent().getModel();
                var aDeferredGroups = oModel.getDeferredGroups();
                aDeferredGroups = aDeferredGroups.concat(["idQuotaNumberInputGroup"]);
                oModel.setDeferredGroups(aDeferredGroups);
                ReuseMessageBox.init(this.getView());
            },
            /**
             * Method to change autoBindingMode of the table if external navigation
             */
            changeTableAutoBinding: function () {
                var oStartParameters = sap.ui.getCore().getModel("startParam");
                if (oStartParameters &&
                    oStartParameters.getData() &&
                    oStartParameters.getData().DocumentType) {
                    this.oSmartTable.setEnableAutoBinding(true);
                }

            },
            /**
             * Method to initialise JSONModel
             */
            initModel: function () {
                var oQuotaModel = new JSONModel({
                    isSearchAllowed: false
                });
                this.getView().setModel(oQuotaModel, "quotaModel");
                this.getView().setModel(new JSONModel({
                    IsEditMode: false,
                    IsEditEnabled: false,
                    editableMaterial: "",
                    saveEnabled: true,
                    IsAddQuotaEnabled: false,
                    IsShowSupplierQuotaEnabled: false,
                    AddQuotaValidFromMinDate: new Date(),
                    IsSourcingMode: false,
                    InvalidQuotaNumberFields: []
                }), "this");
            },
            /**
             * method to return the quotaModel
             * @returns {sap.ui.model.json.JSONModel} quotaModel object
             */
            getQuotaModel: function () {
                return this.getView().getModel("quotaModel");
            },
            /**
             * Press 'Go' button event handler.
             * @param {sap.ui.base.Event} oEvent press event object
             */
            onClickGo: function (oEvent) {
                var aFilterData = oEvent.getSource().getFilterData();
                if (aFilterData && aFilterData.DocumentType === Constants.DOCUMENT_TYPE.SOURCING) {
                    this.getView().getModel("this").setProperty("/IsSourcingMode", true);
                    this.oSmartTable.deactivateColumns(["DocumentDisplayData","TablePartMaterial","ActualQuota","DocumentStatusText","DocumentTypeTexts","StatusId","DocumentValidity"]);         
                } else {
                    this.getView().getModel("this").setProperty("/IsSourcingMode", false);
                    this.oSmartTable.deactivateColumns(["SourcingQuotation","SourcingProject","AwardingScenario","AwardingStatus","CompanyCode","Plant"]);   
                }
                var bIsMandatoryFieldFilled = (!!aFilterData.Material || !!aFilterData.DocumentNo) && !!aFilterData.DocumentType;
                this.getQuotaModel().setProperty("/isSearchAllowed", bIsMandatoryFieldFilled);
                if (!bIsMandatoryFieldFilled) {
                    MessageBox.error(this._oResourceBundle.getText("FilterValidationError"));
                }
                BO.handleCancelEditPress(this.sEditGuid || "", this.getView().getModel(), true)
                    .then()
                    .fail(function (oResponse) {
                        this._handleQuotaFIError(oResponse);
                    }.bind(this));
                this.sEditGuid = BO.generateUUID();
                this.sDocumentType = aFilterData.DocumentType;
                this._updateModelCustomHeader(this.sEditGuid, "MBWVD", aFilterData.DocumentType);
                var that = this;
                if (this.getView().getModel("this").getProperty("/IsEditMode")) {
                    MessageBox.warning(this.geti18nText("changesLostWarningMsg"), {
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: function (sAction) {
                            if (sAction === Constants.MESSAGE.OK) {
                                that._handleCancelSaveQuotaFISuccess();
                            }
                        }
                    });
                }
                this.aSelectedMaterials = [];
                var oThisModel = this.getView().getModel("this");
                oThisModel.setProperty("/IsEditMode", false);
                oThisModel.setProperty("/IsEditEnabled", false);
                oThisModel.setProperty("/editableMaterial", "");
                oThisModel.setProperty("/IsAddQuotaEnabled", false);
                oThisModel.setProperty("/IsShowSupplierQuotaEnabled", false);
            },
            /**
             * Before rebind smart table event handler.
             * @param {sap.ui.base.Event}  oEvent beore rebind smart table 
             */
            onBeforeRebindquotaSmartTable: function (oEvent) {
                var oBindingParams = oEvent.getParameter("bindingParams");
                if (!this.getQuotaModel().getProperty("/isSearchAllowed") || this.getView().getModel("this").getProperty("/IsEditMode")) {
                    oBindingParams.preventTableBind = true;
                }
            },
            /**
             * event handler for quota table data received
             * @param {sap.ui.base.Event}  oEvent - data received event
             */
            handleQuotaTableDataReceived: function (oEvent) {
                this.byId("idCustomTable").expandToLevel(2);
                var aReceivedData = oEvent.getParameters().getParameter("data").results;
                var sReceivedDataLevel, oReceivedDataItemInFocus;
                var oQuotaModel = this.getQuotaModel();
                if (aReceivedData.length && aReceivedData[0]) {
                    oReceivedDataItemInFocus = aReceivedData[0];
                    sReceivedDataLevel = oReceivedDataItemInFocus.HierarchyNodeLevel;
                }
                var oInitValidityConfig = {
                    actualQuotaSum: 0,
                    dedicatedQuotaSum: 0,
                    dedicatedQuotaValidityValue: 0
                }, oValidityConfig;
                // actual / dedicated quota values should be calculated in case Validity Period item is expanded
                // so received data level should be '05'
                if (sReceivedDataLevel === Constants.VALIDITY_PERIOD_LVL) {
                    aReceivedData.forEach(function (oItem) {
                        var oLocalValidityConfig = {};
                        oLocalValidityConfig = Object.assign(oLocalValidityConfig, oInitValidityConfig);
                        oLocalValidityConfig.dedicatedQuotaValidityValue = oItem.DedicatedQuotaPercentage;
                        oQuotaModel.setProperty("/" + oItem.FormatedCode, oLocalValidityConfig);
                    });
                } else if (sReceivedDataLevel === Constants.CONTRACT_LVL) {

                    oValidityConfig = aReceivedData.reduce(function (oConfig, oItem) {
                        if (!oItem.QuotaNumberFc) {
                            oConfig.dedicatedQuotaSum += oItem.QuotaNumber;
                        }
                        if (oItem.DocumentType === Constants.DOCUMENT_TYPE.GROUP || oItem.DocumentType === Constants.DOCUMENT_TYPE.BRAND) {
                            if (!oItem.QuotaNumberFc) {
                                if (oItem.ActualQuotaCalStatus === Constants.DOCUMENT_STATUS.APPROVED) {
                                    oConfig.actualQuotaSum += oItem.QuotaNumber;
                                }
                            }
                        } else {
                            oConfig.actualQuotaSum += oItem.QuotaNumber;
                        }
                        return oConfig;
                    }, oInitValidityConfig);

                    // calculate actual / dedicated values for contracts
                    aReceivedData.forEach(function (oItem) {
                        this.calculateActualValues(oItem, oValidityConfig);
                        this.calculateDedicatedValues(oItem, oValidityConfig);
                    }.bind(this));

                    oQuotaModel.setProperty("/" + oReceivedDataItemInFocus.ParentNode, oValidityConfig);
                    oQuotaModel.updateBindings(true);
                }
            },
            /**
             * Calculate Actual Quota Values
             * @param {Object} oItem Current quota item object
             * @param {Object} oValidityConfig validity configuration object for quota calculation
             */
            calculateActualValues: function (oItem, oValidityConfig) {
                var iActualQuota;
                if (oValidityConfig.actualQuotaSum > 0) {
                    if (oItem.DocumentType === Constants.DOCUMENT_TYPE.GROUP || oItem.DocumentType === Constants.DOCUMENT_TYPE.BRAND) {
                        iActualQuota = oItem.ActualQuotaCalStatus === Constants.DOCUMENT_STATUS.APPROVED ? Math.round((oItem.QuotaNumber / oValidityConfig.actualQuotaSum) * 100) : 0;
                    } else {
                        iActualQuota = Math.round((oItem.QuotaNumber / oValidityConfig.actualQuotaSum) * 100);
                    }
                    if (!oItem.QuotaNumberFc) {
                        oValidityConfig["actual-" + oItem.FormatedCode] = iActualQuota;
                    } else {
                        oValidityConfig["actual-" + oItem.FormatedCode] = 0;
                    }
                } else {
                    oValidityConfig["actual-" + oItem.FormatedCode] = 0;
                }
            },
            /**
             * Calculate Dedicate quota values
             * @param {Object} oItem Current quota item object
             * @param {Object} oValidityConfig validity configuration object for quota calculation
             */
            calculateDedicatedValues: function (oItem, oValidityConfig) {
                var iDedicatedValue;
                if (this.sDocumentType === Constants.DOCUMENT_TYPE.SOURCING) {
                    if (oValidityConfig.dedicatedQuotaSum > 0) {
                        iDedicatedValue = Math.round((oItem.QuotaNumber / oValidityConfig.dedicatedQuotaSum) * 100);
                        oValidityConfig["dedicated-" + oItem.FormatedCode] = iDedicatedValue;
                        oValidityConfig.dedicatedQuotaValidityValue += iDedicatedValue;     
                    } else {
                        oValidityConfig["dedicated-" + oItem.FormatedCode] = 0;
                        oValidityConfig.dedicatedQuotaValidityValue = 0;
                    }
                } else {
                    if (oValidityConfig.dedicatedQuotaSum > 0) {
                        if (!oItem.QuotaNumberFc) {
                            iDedicatedValue = Math.round((oItem.QuotaNumber / oValidityConfig.dedicatedQuotaSum) * 100);
                            oValidityConfig["dedicated-" + oItem.FormatedCode] = iDedicatedValue;
                            oValidityConfig.dedicatedQuotaValidityValue += iDedicatedValue;    
                        }
                        else {
                            oValidityConfig["dedicated-" + oItem.FormatedCode] = 0;
                        }
                    } else {
                        oValidityConfig["dedicated-" + oItem.FormatedCode] = 0;
                        oValidityConfig.dedicatedQuotaValidityValue = 0;
                    }
                }
            },
            /**
             * formatter for actual quota values
             * @param {String} sParentNode parent node value for current item
             * @param {String} sFormatedCode formatedCode value for current itemz
             * @returns {String|null} oParentConfig formatted actual quota percentage value
             */
            formatActualQuotaValue: function (sParentNode, sFormatedCode) {
                var sReturnString;
                if (sParentNode && sFormatedCode) {
                    var oParentConfig = this.getQuotaModel().getProperty("/" + sParentNode);
                    if (oParentConfig) {
                        sReturnString = oParentConfig["actual-" + sFormatedCode] + "%";
                    }
                }
                return sReturnString;
            },
            /**
             * formatter for dedicated quota values
             * @param {String} sNodeLevel node level value for current item
             * @param {String} sParentNode parent node value for current item
             * @param {String} sFormatedCode formatedCode value for current item
             * @returns {String|null} oValidityConfig formatted dedicated quota percentage value
             */
            formatDedicatedQuotaValue: function (sNodeLevel, sParentNode, sFormatedCode) {
                var sReturnString;
                if (sNodeLevel && sParentNode && sFormatedCode) {
                    var oValidityConfig;
                    // formatter for Validity period
                    if (sNodeLevel === Constants.VALIDITY_PERIOD_LVL) {
                        oValidityConfig = this.getQuotaModel().getProperty("/" + sFormatedCode);
                        if (oValidityConfig && oValidityConfig.dedicatedQuotaValidityValue) {
                            sReturnString = oValidityConfig.dedicatedQuotaValidityValue + "%";
                        } else {
                            sReturnString = "0%";
                        }
                    }
                    else {
                        oValidityConfig = this.getQuotaModel().getProperty("/" + sParentNode);
                        if (oValidityConfig) {
                            sReturnString = oValidityConfig["dedicated-" + sFormatedCode] + "%";
                        }
                    }
                }
                return sReturnString;
            },
            /**
             * on edit button press event handler
             */
            onEditQuotaPress: function () {
                if (!this.getView().getModel("this").getProperty("/IsEditMode")) {
                    this._setAppBusy(true);
                    this.refreshQuotaTreeTableSelection();
                    BO.handleEditPress(this.oSelectedQuotaObject, this.getView().getModel())
                        .then(this._handleEditQuotaFISuccess.bind(this, arguments))
                        .fail(function (oResponse) {
                            this._handleQuotaFIError(oResponse);
                        }.bind(this));
                }
            },
            /**
             * Event on Add QUota Press
             */
            onAddQuotaPress: function () {
                if (!this.addQuotaDialog) {
                    this.addQuotaDialog = this.loadFragment({
                        name: "vwks.nlp.s2p.mm.mng.quota.utils.addQuota.AddQuota"
                    });
                }
                this.addQuotaDialog.then(function (oDialog) {
                    oDialog.open();
                    oDialog.setBusy(true);
                    BO.loadAddQuotaDialogData(this.getView().getModel(), this.oSelectedQuotaObject)
                        .then(function (oHeaderResponse) {
                            this.getView().setModel(new JSONModel(oHeaderResponse.GetAddPopUpInfo), "AddQuotaDialogData");
                            this.getView().getModel("AddQuotaDialogData").setProperty("/Material", this.oSelectedQuotaObject.Material);
                            this.getView().getModel("AddQuotaDialogData").setProperty("/FormatedCode", this.oSelectedQuotaObject.FormatedCode);
                            BO.loadAddQuotaDialogContractData(this.byId("idAddQuotaContractList"), this.oSelectedQuotaObject);
                        }.bind(this))
                        .fail(function (oError) {
                            this._handleQuotaFIError(oError);
                        }.bind(this))
                        .always(function () {
                            oDialog.setBusy(false);
                        });
                }.bind(this));
            },
            /**
             * Add Quota Validity Date Change Event
             * @param {sap.ui.base.Event} oEvent press event object
             */
            onAddQuotaValidityFromDateChange: function (oEvent) {
                if (oEvent.getParameter("valid")) {
                    this.byId("idAddQuotaValidityTo").setMinDate(this.byId("idAddQuotaValidityFrom").getDateValue());
                    this.byId("idAddQuotaValidityFrom").setValueState(ValueState.None);
                }
                else {
                    this.getView().getModel("AddQuotaDialogData").setProperty("/ValidityFrom", null);
                    this.byId("idAddQuotaValidityFrom").setValueState(ValueState.Error);
                }
            },
            /**
             * On Change event for Add Quota Validity To Datepicker
             * @param {sap.ui.base.Event} oEvent press event object
             */
            onAddQuotaValidityToDateChange: function (oEvent) {
                if (oEvent.getParameter("valid")) {
                    this.byId("idAddQuotaValidityTo").setValueState(ValueState.None);
                }
                else {
                    this.getView().getModel("AddQuotaDialogData").setProperty("/ValidityTo", null);
                    this.byId("idAddQuotaValidityTo").setValueState(ValueState.Error);
                }
            },
            /**
             * Save Add Quota Button Event
             */
            onPressAddQuotaSave: function () {
                var oAddQuotaHeaderData = this.getView().getModel("AddQuotaDialogData").getData(),
                    oAddQuotaContractsTable = this.byId("idAddQuotaContractList"),
                    aAddQuotaData = BO.prepareAddQuotaData(oAddQuotaHeaderData, oAddQuotaContractsTable, this.oSelectedQuotaObject),
                    oModel = this.getView().getModel();

                if (!BO.validateDialogData(this.getView(), oAddQuotaHeaderData)) {
                    return;
                }

                var aDeferredGroups = oModel.getDeferredGroups();
                aDeferredGroups = aDeferredGroups.concat(["AddQuotaFIBatchGroup"]);
                oModel.setDeferredGroups(aDeferredGroups);
                oModel.setUseBatch(true);
                for (var i = 0; i < aAddQuotaData.length; i++) {
                    var oObject = aAddQuotaData[i];
                    oModel.callFunction("/AddQuota", {
                        method: "POST",
                        urlParameters: oObject,
                        batchGroupId: "AddQuotaFIBatchGroup",
                        changeSetId: "AddQuotaFIBatchChangeID"
                    });
                }
                this._setAppBusy(true);
                oModel.submitChanges({
                    batchGroupId: "AddQuotaFIBatchGroup",
                    success: function (oResponse, oData) {
                        this._setAppBusy(false);
                        this._handleAddQuotaSaveFISuccess(oResponse, oData);
                    }.bind(this),
                    error: function (oError) {
                        this._setAppBusy(false);
                        this._handleQuotaFIError(oError);
                    }.bind(this)
                });
            },

            /**
             * Event on Add Quota Cancel Button Press
             */
            onPressAddQuotaCancel: function () {
                this.getQuotaModel().setProperty("AddQuotaDialog", {});
                this.addQuotaDialog.then(function (oDialog) {
                    oDialog.close();
                    oDialog.destroy();
                });
                this.addQuotaDialog = null;
                this.byId("idAddQuotaContractList").destroyAggregation("items");
            },
            /**
             * on cancel button press event handler
             */
            onCancelSaveQuotaUpdates: function () {
                this._setAppBusy(true);
                BO.handleCancelEditPress(this.sEditGuid, this.getView().getModel())
                    .then(this._handleCancelSaveQuotaFISuccess.bind(this, arguments))
                    .fail(function (oResponse) {
                        this._handleQuotaFIError(oResponse);
                    }.bind(this));
            },
            /**
             * on save button press event handler
             */
            onSaveQuotaUpdates: function () {
                this._setAppBusy(true);
                BO.handleSavePress(this.sEditGuid, this.getView().getModel())
                    .then(function (oResponse, oData) {
                        this._handleSaveQuotaFISuccess(oResponse, oData);
                    }.bind(this))
                    .fail(function (oResponse) {
                        this._setAppBusy(false);
                        var oMessages = {};
                        oMessages.results = [];
                        if (oResponse.responseText) {
                            var oErrorResponse = JSON.parse(oResponse.responseText);
                            if (oErrorResponse &&
                                oErrorResponse.error && oErrorResponse.error.innererror &&
                                oErrorResponse.error.innererror.errordetails
                            ) {
                                JSON.parse(oResponse.responseText).error.innererror.errordetails.forEach(function (item) {
                                    oMessages.results.push({
                                        Type: Constants.MESSAGE_TYPE.ERROR,
                                        Message: item.message
                                    });
                                });
                            }
                        }
                        ReuseMessageBox.loadDialog(oMessages);
                    }.bind(this));
            },
            /**
             * Event on Quota Table Selection Change
             * @param {sap.ui.base.Event}  oEvent selectionChange event object 
             */
            onQuotaTableRowSelectionChange: function (oEvent) {
                var oTreeTable = this.byId("idQuotaSmartTable").getTable();
                var aSelectedIndices = oEvent.getSource().getSelectedIndices();
                if (aSelectedIndices.length === 1) {
                    this.oSelectedQuotaObject = oTreeTable.getContextByIndex(aSelectedIndices[0]).getObject();
                    if (this.oSelectedQuotaObject.DocumentType === Constants.DOCUMENT_TYPE.GROUP ||
                        this.oSelectedQuotaObject.DocumentType === Constants.DOCUMENT_TYPE.SOURCING ||
                        this.sDocumentType === Constants.DOCUMENT_TYPE.SOURCING) {
                        if (this.oSelectedQuotaObject.HierarchyNodeLevel === "01" && !this.oSelectedQuotaObject.ParentNode) {
                            this.getView().getModel("this").setProperty("/IsEditEnabled", true);
                            this.currentIndex = aSelectedIndices[0];
                        }
                        else {
                            this.getView().getModel("this").setProperty("/IsEditEnabled", false);
                        }
                        if (!this.getView().getModel("this").getProperty("/IsEditMode") &&
                            (this.oSelectedQuotaObject.HierarchyNodeLevel === Constants.TREE_LEVEL.TWO || this.oSelectedQuotaObject.HierarchyNodeLevel === Constants.TREE_LEVEL.THREE) &&
                            this.sDocumentType !== Constants.DOCUMENT_TYPE.SOURCING
                        ) {
                            this.getView().getModel("this").setProperty("/IsAddQuotaEnabled", true);
                        } else {
                            this.getView().getModel("this").setProperty("/IsAddQuotaEnabled", false);
                        }
                    }
                }
                else {
                    this.getView().getModel("this").setProperty("/IsEditEnabled", false);
                    this.getView().getModel("this").setProperty("/IsAddQuotaEnabled", false);
                }
                if (aSelectedIndices.length > 0 && this.sDocumentType !== Constants.DOCUMENT_TYPE.SOURCING) {
                    var bOnlyMaterialSelected = false;
                    var aSelectedMaterials = [];
                    aSelectedIndices.every(function (iIndex) {
                        var oRowContext = oTreeTable.getContextByIndex(iIndex);
                        var oSelectedObject = oRowContext.getObject();
                        if (oSelectedObject.HierarchyNodeLevel === Constants.MATERIAL_LVL && !oSelectedObject.ParentNode) {
                            bOnlyMaterialSelected = true;
                            aSelectedMaterials.push(oSelectedObject.Material);
                            return true;
                        } else {
                            bOnlyMaterialSelected = false;
                            aSelectedMaterials = [];
                            return false;
                        }
                    });
                    if (bOnlyMaterialSelected && aSelectedMaterials.length > 0) {
                        this.aSelectedMaterials = aSelectedMaterials;
                        this.getView().getModel("this").setProperty("/IsShowSupplierQuotaEnabled", true);
                    } else {
                        this.getView().getModel("this").setProperty("/IsShowSupplierQuotaEnabled", false);
                    }
                } else {
                    this.aSelectedMaterials = [];
                    this.getView().getModel("this").setProperty("/IsShowSupplierQuotaEnabled", false);
                }
            },
            /**
             * press event for Show Supplier Quota Button
             */
            onShowSupplierQuotaPress: function () {
                if (!this.supplierQuotaDialog) {
                    this.supplierQuotaDialog = this.loadFragment({
                        name: "vwks.nlp.s2p.mm.mng.quota.utils.supplierQuota.ShowSupplierQuota"
                    });
                }
                BO.getSupplierQuotaDetails(this.getView().getModel(), this.aSelectedMaterials, this.oSelectedQuotaObject).then(function (oResponse) {
                    this.getView().setModel(new JSONModel(oResponse.results), "supplierQuota");
                }.bind(this));
                this.supplierQuotaDialog.then(function (oDialog) {
                    oDialog.open();
                });
            },
            /**
             * on close supplier quota
             */
            onPressSupplierQuotaClose: function () {
                this.supplierQuotaDialog.then(function (oDialog) {
                    oDialog.close();
                });
            },
            /**
             * Event on Quota number change in edit mode
             * @param {sap.ui.base.Event}  oEvent press event object
             */
            onChangeQuotaNumber: function (oEvent) {
                var oModel = this.getView().getModel();
                var sPath = oEvent.getSource().getBindingContext().getPath();
                var oData = oModel.getObject(sPath);

                var aKeys = this._oTreeTable.getBinding("rows").oKeys;
                var sValidityContext = this.getView().getModel().createKey("/xVWKSxNLP_INTG_C_TREE_QUOTA",
                    {
                        FormatedCode: oData.ParentNode
                    });

                var aCurrentValidityBindingPaths = aKeys[sValidityContext.slice(1, sValidityContext.length)];
                var aCurrentValidityContracts = [];

                aCurrentValidityBindingPaths.forEach(function (sContractPath) {
                    var oItemData = oModel.getObject("/" + sContractPath);
                    oItemData.QuotaNumber = parseInt(oItemData.QuotaNumber, 10);
                    aCurrentValidityContracts.push(oItemData);
                });
                var oThisModel = this.getView().getModel("this");
                var aInvalidQuotaNumberFields = oThisModel.getProperty("/InvalidQuotaNumberFields");
                if (oData.QuotaNumber) {
                    if ((oData.QuotaNumber > 999 || oData.QuotaNumber < 0) || !(Number.isInteger(parseFloat(oData.QuotaNumber)))) {
                        oEvent.getSource().setValueState(ValueState.Error);
                        if (!aInvalidQuotaNumberFields.includes(oData.FormatedCode)) {
                            aInvalidQuotaNumberFields.push(oData.FormatedCode);
                        }
                        oThisModel.setProperty("/saveEnabled", false);
                        oThisModel.setProperty("/InvalidQuotaNumberFields", aInvalidQuotaNumberFields);
                        return;
                    } else {
                        if (aInvalidQuotaNumberFields.includes(oData.FormatedCode)) {
                            aInvalidQuotaNumberFields.splice(aInvalidQuotaNumberFields.indexOf(oData.FormatedCode), 1);
                        }
                        oThisModel.setProperty("/InvalidQuotaNumberFields", aInvalidQuotaNumberFields);
                    }
                    this._setAppBusy(true);
                    oEvent.getSource().setValueState(ValueState.None);
                    if (oThisModel.getProperty("/InvalidQuotaNumberFields").length === 0) {
                        oThisModel.setProperty("/saveEnabled", true);
                    } else {
                        oThisModel.setProperty("/saveEnabled", false);
                    }
                    if (oData.QuotaNumber === "0") {
                        MessageBox.information(this.geti18nText(Constants.I18N_TEXT.DEDICATED_INFO));
                    }
                    BO.handleQuotaNumberUpdate(this.getView().getModel(), oData)
                        .then(function () {
                            this._quotaNumberChangeCalculations(aCurrentValidityContracts);
                        }.bind(this))
                        .fail(function (oResponse) {
                            this._handleQuotaFIError(oResponse);
                        }.bind(this));
                } else {
                    oEvent.getSource().setValueState(ValueState.Error);
                    this.getView().getModel("this").setProperty("/saveEnabled", false);
                }
            },
            /**
            * refresh tree table selection to current line
            */
            refreshQuotaTreeTableSelection: function () {
                this.currentIndex = this._oTreeTable.getSelectedIndex();
            },
            /**
             * method to check edit scenario -> Input is visible
             * @param {String} sMaterial : currently selected material in table
             * @param {Boolean} bQuotaNumberFc : Flag for status Id '2'
             * @returns {Boolean} true if current selected material is marked as editable in JSONModel
             */
            getEditableQuotaInput: function (sMaterial, bQuotaNumberFc) {
                if (this.sDocumentType === Constants.DOCUMENT_TYPE.SOURCING) {
                    return (sMaterial === this.getView().getModel("this").getProperty("/editableMaterial"));
                } else {
                    return (sMaterial === this.getView().getModel("this").getProperty("/editableMaterial") && (!bQuotaNumberFc));
                }
            },
            /**
             * method to check if non-edit scenario -> Text is visible
             * @param {String} sMaterial : currently selected material in table
             * @param {Boolean} bQuotaNumberFc : Flag for status Id '2'
             * @returns {Boolean} false if current selected material is marked as editable in JSONModel
             */
            getEditableQuotaText: function (sMaterial, bQuotaNumberFc) {
                if (this.sDocumentType === Constants.DOCUMENT_TYPE.SOURCING) {
                    return !(sMaterial === this.getView().getModel("this").getProperty("/editableMaterial"));
                } else {
                    if (sMaterial === this.getView().getModel("this").getProperty("/editableMaterial")) {
                        return bQuotaNumberFc;
                    }
                    else {
                        return true;
                    }
                }
            },
            /**
             * Event handler for document number click
             * @param {sap.ui.base.Event}  oEvent press event object
             */
            navigateToDocument: function (oEvent) {
                var sSelectedContract = oEvent.getSource().getProperty("text");
                var oBindingContext = oEvent.getSource().getBindingContext();
                var sDocType = oBindingContext.getModel().getObject(oBindingContext.getPath()).DocumentType,
                    sDocumentNumber = sSelectedContract.split("/")[0],
                    sDocNumberItem = sSelectedContract.split("/")[1],
                    sDistributionKey = sSelectedContract.split("/")[2],
                    sContractHeader, sContractItem, sContractItemDistribution, sRequiredUrl;
                switch (sDocType) {
                    case Constants.DOCUMENT_TYPE.BRAND:
                        //Brand Contract Item
                        //Navigating to item page of brand contract in manage central purchase contract
                        sContractHeader = this.getView().getModel("MCPC").createKey("C_CentralPurchaseContractTP", {
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItem = this.getView().getModel("MCPC").createKey("C_CntrlPurchaseContractItemTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItemDistribution = this.getView().getModel("MCPC").createKey("C_CntrlPurContrDistributionTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            DistributionKey: sDistributionKey,
                            IsActiveEntity: true
                        });
                        sRequiredUrl = sContractHeader + "/to_CntrlPurchaseContractItemTP(" + sContractItem.split("(")[1] +
                            "/to_CntrlPurContrDistributionTP(" + sContractItemDistribution.split("(")[1];

                        this._navigate("MCPC", sRequiredUrl, null);
                        break;

                    case Constants.DOCUMENT_TYPE.GROUP:
                        //Hierarchy Contract Header
                        //Navigating to object page of Hierarchy contract in manage central purchase contract
                        sContractHeader = this.getView().getModel("MCPC").createKey("C_CntrlPurContrHierHdrTP", {
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItem = this.getView().getModel("MCPC").createKey("C_CntrlPurchaseContractItemTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItemDistribution = this.getView().getModel("MCPC").createKey("C_CntrlPurContrDistributionTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            DistributionKey: sDistributionKey,
                            IsActiveEntity: true
                        });
                        sRequiredUrl = sContractHeader + "/to_CntrlPurchaseContractItemTP(" + sContractItem.split("(")[1] +
                            "/to_CntrlPurContrDistributionTP(" + sContractItemDistribution.split("(")[1];
                        this._navigate("MCPC", sRequiredUrl, null);
                        break;

                    case Constants.DOCUMENT_TYPE.INFORMATION:
                        var oModel = this.getView().getModel("MCPC");
                        sContractHeader = oModel.createKey("C_CentralPurchaseContractTP", {
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItem = oModel.createKey("C_CntrlPurchaseContractItemTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            IsActiveEntity: true
                        });
                        sContractItemDistribution = oModel.createKey("C_CntrlPurContrDistributionTP", {
                            CentralPurchaseContractItem: sDocNumberItem,
                            CentralPurchaseContract: sDocumentNumber,
                            DraftUUID: ReuseConstants.INITIAL_GUID,
                            DistributionKey: sDistributionKey,
                            IsActiveEntity: true
                        });
                        sRequiredUrl = sContractHeader + "/to_CntrlPurchaseContractItemTP(" + sContractItem.split("(")[1] +
                            "/to_CntrlPurContrDistributionTP(" + sContractItemDistribution.split("(")[1];

                        this._navigate("MCPC", sRequiredUrl, null);
                        break;
                    default:
                        return;
                }
            },
            /**
            * Get navigation path and open in new window using sap.m.URLHelper
             * This is needed because cross app navigation from popup is not supported - BCP 2180308953
             * @param {String} sOutboundTarget Outbound target configured in manifest
             * @param {String} sRequiredUrl navigation path
             * @param {Object} oParams Navigation parameters
             */
            _navigate: function (sOutboundTarget, sRequiredUrl, oParams) {
                //Get path for navigation
                NavigationHelper.getNavigationPath(this, sOutboundTarget, sRequiredUrl, oParams, false, true)
                    .then(function (oNavigationDetails) {
                        //Open in new window
                        NavigationHelper.navigateWithURLHelper(oNavigationDetails.sPath, true);
                    });
            },
            /**
             * Add Quota Save Funcion Import Success
             * @param {Object} oResponse oData function import response Object
             * @param {Object} oResponseData oData function import data object
             */
            _handleAddQuotaSaveFISuccess: function (oResponse, oResponseData) {
                //if response contains error object then only perform the checks
                if (oResponse.__batchResponses.length > 0 && oResponse.__batchResponses[0].__changeResponses) {
                    //get the error from deferred oData objects
                    var aChangeResponses = oResponse.__batchResponses[0].__changeResponses;
                    //get the message by parsing JSON body only if it is available 
                    if (aChangeResponses.length > 0) {
                        var oMessageBody = JSON.parse(aChangeResponses[aChangeResponses.length - 1].body).d;
                        //if body contains results, check if it is in error type 'E', otherwise success
                        if (oMessageBody.results.length > 0 &&
                            !(oMessageBody.results.length === 1 && oMessageBody.results[0].Type !== Constants.MESSAGE_TYPE.ERROR)) {
                            ReuseMessageBox.loadDialog(oMessageBody);
                            return;
                        }
                    }
                }
                this.addQuotaDialog.then(function (oDialog) {
                    oDialog.close();
                });
                this._handleSaveQuotaFISuccess(oResponse, oResponseData, true);
            },
            /**
            * Edit Quota Function import success
            */
            _handleEditQuotaFISuccess: function () {
                this.getView().getModel("this").setProperty("/IsEditMode", true);
                this.getView().getModel("this").setProperty("/editableMaterial", this.oSelectedQuotaObject.Material);
                this.getView().getModel("this").updateBindings(true);
                this._setAppBusy(false);
            },
            /**
            * Cancel Save quota Function import success
            */
            _handleCancelSaveQuotaFISuccess: function () {
                this._resetThisModel();
                this.sEditGuid = BO.generateUUID();
                this._updateModelCustomHeader(this.sEditGuid, "MBWVD", this.sDocumentType);
                this.getView().getModel().resetChanges();
                this.getQuotaModel().updateBindings(true);
                this.getView().getModel("this").updateBindings(true);
                this.oSmartTable.rebindTable();
                this._setAppBusy(false);
            },
            /**
             * save quota function import success
             * @param {Object} oResponse oData function import response Object
             * @param {Object} oResponseData oData function import data object
             * @param {Boolean} IsMessageAvailable flag to check if header message available
             */
            _handleSaveQuotaFISuccess: function (oResponse, oResponseData, IsMessageAvailable) {
                this._resetThisModel();
                this.sEditGuid = BO.generateUUID();
                this._updateModelCustomHeader(this.sEditGuid, "MBWVD", this.sDocumentType);
                this.getView().getModel().resetChanges();
                this.oSmartTable.rebindTable();
                this.getView().getModel("this").updateBindings(true);
                this._setAppBusy(false);
                MessageToast.show(this.geti18nText("AddQuotaSaveSuccessMessage")); 
            },
            /**
             * handle error on function import call
             * @param {Object} oError oData function import http error object
             */
            _handleQuotaFIError: function (oError) {
                this._setAppBusy(false);
                MessageBox.error(JSON.parse(oError.responseText).error.message.value);
            },
            /**
             * reset 'this' model
             */
            _resetThisModel: function () {
                var oModel = this.getView().getModel("this");
                var oData = oModel.getData();
                oData.IsEditMode = false;
                oData.editableMaterial = "";
                oData.IsEditEnabled = false;
                oData.IsShowSupplierQuotaEnabled = false;
                oData.IsAddQuotaEnabled = false;
                oModel.setData(oData);
            },
            /**
             * Method to show busy Indicator
             * @param {boolean} bFlag flag to indicate to show/hide busy indicator 
             */
            _setAppBusy: function (bFlag) {
                if (bFlag) {
                    BusyIndicator.show();
                } else {
                    BusyIndicator.hide();
                }
            },
            /**
             * Method to update custom header
             * @param {String} value1 custom header first value
             * @param {String} value2 custom header second value
             * @param {String} value3 custom header third value
             */
            _updateModelCustomHeader: function (value1, value2, value3) {
                this.getView().getModel().setHeaders({
                    "SessionID": value1,
                    "treetype": value2,
                    "DocumentType": value3
                });
            },
            /**
             * Method to apply default routing filters
             */
            _applyRoutingDefaultFilters: function () {
                if (sap.ui.getCore().getModel("startParam")) {
                    var oStartParameters = sap.ui.getCore().getModel("startParam").getData();
                    var that = this;
                    if (oStartParameters) {
                        if (oStartParameters.Material) {
                            oStartParameters.Material.forEach(function (sMaterial) {
                                that._addFilterValues("Material", sMaterial);
                            });
                        }

                        if (oStartParameters.DocumentNo) {
                            oStartParameters.DocumentNo.forEach(function (sDocumentNo) {
                                that._addFilterValues("DocumentNo", sDocumentNo);
                            });
                        }

                        if (oStartParameters.CompanyCode) {
                            oStartParameters.CompanyCode.forEach(function (sCompanyCode) {
                                that._addFilterValues("CompanyCode", sCompanyCode);
                            });
                        }

                        if (oStartParameters.DocumentType) {
                            var sNewDocType;
                            oStartParameters.DocumentType.forEach(function (sDocumentType) {
                                switch (sDocumentType) {
                                    case Constants.DOCUMENT_TYPE.HIERARCHY:
                                        sNewDocType = Constants.DOCUMENT_TYPE.GROUP;
                                        break;

                                    case Constants.DOCUMENT_TYPE.HBRAND:
                                        sNewDocType = Constants.DOCUMENT_TYPE.BRAND;
                                        break;

                                    case Constants.DOCUMENT_TYPE.SOURCING:
                                        sNewDocType = Constants.DOCUMENT_TYPE.SOURCING;
                                        break;
                                }
                                that._addFilterValuesKey("DocumentType", sNewDocType);
                            });
                        }
                    }
                }
            },
            /**
             * Method for caluculations on quota number change
             * @param {Array} aReceivedData Array of received data for quota calculation
             */
            _quotaNumberChangeCalculations: function (aReceivedData) {
                var sReceivedDataLevel, oReceivedDataItemInFocus;
                if (aReceivedData.length && aReceivedData[0]) {
                    oReceivedDataItemInFocus = aReceivedData[0];
                    sReceivedDataLevel = oReceivedDataItemInFocus.HierarchyNodeLevel;
                }
                var oInitValidityConfig = {
                    actualQuotaSum: 0,
                    dedicatedQuotaSum: 0,
                    dedicatedQuotaValidityValue: 0
                }, oValidityConfig;
                // actual / dedicated quota values should be calculated in case Validity Period item is expanded
                // so received data level should be '05'
                if (sReceivedDataLevel === Constants.VALIDITY_PERIOD_LVL) {
                    this.getQuotaModel().setProperty("/" + oReceivedDataItemInFocus.FormatedCode, oInitValidityConfig);
                } else if (sReceivedDataLevel === Constants.CONTRACT_LVL) {

                    oValidityConfig = aReceivedData.reduce(function (oConfig, oItem) {
                        if (!oItem.QuotaNumberFc) {
                            oConfig.dedicatedQuotaSum += oItem.QuotaNumber;
                        }
                        if (oItem.DocumentType === Constants.DOCUMENT_TYPE.GROUP || oItem.DocumentType === Constants.DOCUMENT_TYPE.BRAND) {
                            if (oItem.ActualQuotaCalStatus === Constants.DOCUMENT_STATUS.APPROVED) {
                                if (!oItem.QuotaNumberFc) {
                                    oConfig.actualQuotaSum += oItem.QuotaNumber;
                                }
                            }
                        } else {
                            oConfig.actualQuotaSum += oItem.QuotaNumber;
                        }
                        return oConfig;
                    }, oInitValidityConfig);

                    // calculate actual / dedicated values for contracts
                    aReceivedData.forEach(function (oItem) {
                        this.calculateActualValues(oItem, oValidityConfig);
                        this.calculateDedicatedValues(oItem, oValidityConfig);
                    }.bind(this));

                    this.getQuotaModel().setProperty("/" + oReceivedDataItemInFocus.ParentNode, oValidityConfig);

                }
                this.getQuotaModel().updateBindings(true);
                this._setAppBusy(false);
            },
            /**
             * Set Initial Filter Values 
             * @param {String} key key for intial smart filters
             * @param {String} value Value for intial smart filters  
             */
            _addFilterValues: function (key, value) {
                var oSmartFilterBar = this.byId("smartFilterBar");
                oSmartFilterBar.attachInitialized(function () {
                    var oField = oSmartFilterBar.getControlByKey(key);
                    oField.setValue(value);
                });
            },
            /**
             * set initial key for drop-down value help
             * @param {String} key key for intial smart filters 
             * @param {String} value Value for intial smart filters  
             */
            _addFilterValuesKey: function (key, value) {
                var oSmartFilterBar = this.byId("smartFilterBar");
                oSmartFilterBar.attachInitialized(function () {
                    var oField = oSmartFilterBar.getControlByKey(key);
                    oField.setSelectedKey(value);
                });
            },
            /**
             * method get i18n texts
             * @param {String} sText string value to get i18n text
             * @returns {String} text from correspopnding i18n file 
             */
            geti18nText: function (sText) {
                return this.getView().getModel("i18n").getResourceBundle().getText(sText);
            }
        });
    });
