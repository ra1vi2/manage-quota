sap.ui.define([
    "./Constants",
    "sap/ui/core/IconColor"
], function (Constants, IconColor) {
    "use strict";
    var formatter = {

        /**
         * formatter method for message icon
         * @param {string} sStatus status of the message
         * @return {string} message icon
         */
        messageIconFormatter: function (sStatus) {
            var sMessageIcon = "";
            switch (sStatus) {
                case "S":
                    sMessageIcon = Constants.Icons.Success;
                    break;
                case "W":
                    sMessageIcon = Constants.Icons.Warning;
                    break;
                case "E":
                    sMessageIcon = Constants.Icons.Error;
                    break;
            }
            return sMessageIcon;
        },

        /**
         * formatter method for message icon color
         * @param {string} sStatus status of the message
         * @return {string} color of the icon
         */
        messageIconColorFormatter: function (sStatus) {
            var sMessageIconColor = "";
            switch (sStatus) {
                case "S":
                    sMessageIconColor = IconColor.Positive;
                    break;
                case "W":
                    sMessageIconColor = IconColor.Critical;
                    break;
                case "E":
                    sMessageIconColor = IconColor.Negative;
                    break;
                default:
                    sMessageIconColor = IconColor.Neutral;
            }
            return sMessageIconColor;
        }
    };
    return formatter;
}, true);