sap.ui.define([
], function () {
    /* eslint-enable max-params */
    "use strict";
    return {
        /**
           * Utility method to call odata function import
           * @param {sap.ui.model.odata.ODataModel} oModel - Odata Model reference
           * @param {String} sPath - odata request path
           * @param {Object} mParameters - parameters map
           * @returns {jQuery.Deferred.Promise} A promise to call ODATA Function Import
           */
        odataCallFunction: function (oModel, sPath, mParameters) {
            var oCallFunctionDeferred = jQuery.Deferred(),
                mRequestProps = jQuery.extend(true, {
                    success: oCallFunctionDeferred.resolve,
                    error: oCallFunctionDeferred.reject
                }, mParameters);

            var sPathPrefix = /^\/.*$/.test(sPath) ? "" : "/";
            oModel.callFunction(sPathPrefix + sPath, mRequestProps);

            return oCallFunctionDeferred.promise();
        },
        /**
         * Utility for promise to call odataRead
         * @param {sap.ui.model.odata.ODataModel} oModel - Odata Model reference 
         * @param {String} sPath  odata request path
         * @param {Object} mParameters parameters map
         * @returns {jQuery.Deferred.Promise} A promise to call ODATA Read
         */
        odataRead: function (oModel, sPath, mParameters) {
			var oReadDeferred = jQuery.Deferred(),
				mRequestProps = jQuery.extend(true, {
					success: oReadDeferred.resolve,
					error: oReadDeferred.reject
				}, mParameters);

			var sPathPrefix = /^\/.*$/.test(sPath) ? "" : "/";
			oModel.read(sPathPrefix + sPath, mRequestProps);

			return oReadDeferred.promise();
		},
        /**
         * Perform deferred ODATA update request
         * @param {sap.ui.model.odata.ODataModel} oODataModel - Odata Model reference
         * @param {string} sEntitySet - Entity set containing updated entity
         * @param {Object} oUpdatedData - Entity data to be updated
         * @param {Object} mParameters - Additional request parameters
         * @returns {jQuery.Deferred.Promise} Deferred update call
         */
        odataUpdate: function (oODataModel, sEntitySet, oUpdatedData, mParameters) {
            var oUpdateDeferred = jQuery.Deferred();
            var mRequestProps = jQuery.extend(true, {
                success: oUpdateDeferred.resolve,
                error: oUpdateDeferred.reject
            }, mParameters);

            var sPathPrefix = /^\/.*$/.test(sEntitySet) ? "" : "/";
            oODataModel.update(sPathPrefix + sEntitySet, oUpdatedData, mRequestProps);

            return oUpdateDeferred.promise();
        }

    };
});