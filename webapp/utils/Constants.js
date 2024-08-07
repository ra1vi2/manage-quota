sap.ui.define([], function () {
    "use strict";
    return Object.freeze({
        VALIDITY_PERIOD_LVL: "04",
        CONTRACT_LVL: "05",
        MATERIAL_LVL: "01",
        
        MESSAGE_TYPE : {
          ERROR : "E"
        },

        DOCUMENT_STATUS: {
            APPROVED: "05",
            IN_APPROVAL: "In Preparation"
        },

        DOCUMENT_TYPE: {
            BRAND: "BC",
            GROUP: "GC",
            HIERARCHY : "HC",
            HBRAND : "CC",
            INFORMATION : "IC",
            SOURCING : "SO"
        },
        MESSAGE : {
            OK : "OK"
        },
        SMART_FILTER:{
            DOCUMENT_TYPE : "DocumentType"
        },
        TREE_LEVEL:{
            ONE: "01",
            TWO: "02",
            THREE: "03",
            FOUR: "04",
            FIVE: "05"
        },
        I18N_TEXT : {
            DEDICATED_ERROR : "dedicatedQuotaValidityErrorMsg",
            DEDICATED_INFO : "dedicatedQuotaValidityInfoMsg",
            QUOTA_NUM_ERROR : "invalidQuotaNumberError"
        },
        PROPERTIES : {
            QUOTANUMBER : "QuotaNumber",
            ADD_QUOTA_SELECT : "FormatedCode,DocumentDisplayData,SupplierName,SupplierNo, QuotaNumber" 
        },
        Icons: {
			Success: "sap-icon://message-success",
			Warning: "sap-icon://message-warning",
			Error: "sap-icon://message-error"
		}
    });
});
