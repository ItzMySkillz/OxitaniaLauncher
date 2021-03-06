/**
 * AuthManager
 *
 * This module aims to abstract login procedures. Results from Mojang's REST api
 * are retrieved through our Mojang module. These results are processed and stored,
 * if applicable, in the config using the ConfigManager. All login procedures should
 * be made through this module.
 *
 * @module authmanager
 */
// Requirements
const ConfigManager = require('./configmanager')
const LoggerUtil    = require('./loggerutil')
const Mojang        = require('./mojang')
const {v3: uuidv3}  = require('uuid')
const {machineIdSync} = require('node-machine-id')
const logger        = LoggerUtil('%c[AuthManager]', 'color: #a02d2a; font-weight: bold')
const loggerSuccess = LoggerUtil('%c[AuthManager]', 'color: #209b07; font-weight: bold')
const AzuriomAuth = require('azuriom-auth');

// Functions

/**
 * Add an account. This will authenticate the given credentials with Mojang's
 * authserver. The resultant data will be stored as an auth account in the
 * configuration database.
 *
 * @param {string} username The account username (email if migrated).
 * @param {string} password The account password.
 * @returns {Promise.<Object>} Promise which resolves the resolved authenticated account object.
 */

exports.addAccount = async function login(email, password) {
    const authenticator = new AzuriomAuth.Authenticator('https://oxitania.tk');
    try {
        const user = await authenticator.auth(email, password);
        const ret = ConfigManager.addAuthAccount(user.uuid, user.uuid, user.username, user.username)
        if (ConfigManager.getClientToken() == null) {
        ConfigManager.setClientToken(user.uuid)
        }
        ConfigManager.save()
        return ret
    } catch (err) {
        return Promise.reject(err)
    }
  }
/**
 * Remove an account. This will invalidate the access token associated
 * with the account and then remove it from the database.
 *
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>} Promise which resolves to void when the action is complete.
 */
exports.removeAccount = async function (uuid) {
    try {
        const authAcc = ConfigManager.getAuthAccount(uuid)
        await authenticator.invalidate(authAcc.accessToken, ConfigManager.getClientToken())
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return Promise.resolve()
    } catch (err) {
        return Promise.reject(err)
    }
}

/**
 * Validate the selected account with Mojang's authserver. If the account is not valid,
 * we will attempt to refresh the access token and update that value. If that fails, a
 * new login will be required.
 *
 * **Function is WIP**
 *
 * @returns {Promise.<boolean>} Promise which resolves to true if the access token is valid,
 * otherwise false.
 */
exports.validateSelected = async function () {
    const current = ConfigManager.getSelectedAccount()
    const isValid = await authenticator.validate(current.accessToken, ConfigManager.getClientToken())
    if (!isValid) {
        try {
            const session = await authenticator.refresh(current.accessToken, ConfigManager.getClientToken())
            ConfigManager.updateAuthAccount(current.uuid, session.accessToken)
            ConfigManager.save()
        } catch (err) {
            logger.debug('Erreur lors de la validation du profil sélectionné:', err)
            if (err && err.error === 'ForbiddenOperationException') {
                // What do we do?
            }
            logger.log('Le jeton d\'accès au compte n\'est pas valide.')
            return false
        }
        loggerSuccess.log('Jeton d\'accès au compte validé.')
        return true
    } else {
        loggerSuccess.log('Jeton d\'accès au compte validé.')
        return true
    }
}