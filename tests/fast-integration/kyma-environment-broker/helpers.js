const { wait, debug } = require("../utils");
const { expect } = require("chai");

async function provisionSKR(
  keb,
  gardener,
  instanceID,
  name,
  platformCreds,
  btpOperatorCreds,
  customParams
) {
  const resp = await keb.provisionSKR(
    name,
    instanceID,
    platformCreds,
    btpOperatorCreds,
    customParams
  );
  expect(resp).to.have.property("operation");

  const operationID = resp.operation;
  const shootName = resp.dashboard_url.split(".")[1];
  debug(`Operation ID ${operationID}`, `Shoot name ${shootName}`);

  await ensureOperationSucceeded(keb, instanceID, operationID);

  const shoot = await gardener.getShoot(shootName);
  debug(`Compass ID ${shoot.compassID}`);

  return {
    operationID,
    shoot,
  };
}

function ensureValidShootOIDCConfig(shoot, targetOIDCConfig) {
  expect(shoot).to.have.nested.property("oidcConfig.clientID", targetOIDCConfig.clientID);
  expect(shoot).to.have.nested.property("oidcConfig.issuerURL", targetOIDCConfig.issuerURL);
  expect(shoot).to.have.nested.property("oidcConfig.groupsClaim", targetOIDCConfig.groupsClaim);
  expect(shoot).to.have.nested.property("oidcConfig.usernameClaim", targetOIDCConfig.usernameClaim);
  expect(shoot).to.have.nested.property(
    "oidcConfig.usernamePrefix",
    targetOIDCConfig.usernamePrefix
  );
  expect(shoot.oidcConfig.signingAlgs).to.eql(targetOIDCConfig.signingAlgs);
}

async function deprovisionSKR(keb, instanceID) {
  const resp = await keb.deprovisionSKR(instanceID);
  expect(resp).to.have.property("operation");

  const operationID = resp.operation;
  debug(`Operation ID ${operationID}`);

  await ensureOperationSucceeded(keb, instanceID, operationID);

  return operationID;
}

async function updateSKR(keb, gardener, instanceID, shootName, customParams) {
  const resp = await keb.updateSKR(instanceID, customParams);
  expect(resp).to.have.property("operation");

  const operationID = resp.operation;
  debug(`Operation ID ${operationID}`);

  await ensureOperationSucceeded(keb, instanceID, operationID);

  const shoot = await gardener.getShoot(shootName);

  return {
    operationID,
    shoot,
  };
}

async function ensureOperationSucceeded(keb, instanceID, operationID) {
  const res = await wait(
    () => keb.getOperation(instanceID, operationID),
    (res) => res && res.state && (res.state === "succeeded" || res.state === "failed"),
    1000 * 60 * 60 * 2, // 2h
    1000 * 30 // 30 seconds
  );

  debug("KEB operation:", res);
  if(res.state !== "succeeded") {
    throw(`operation didn't succeed in 2h: ${JSON.stringify(res)}`);
  }
  return res;
}

async function getShootName(keb, instanceID) {
  const resp = await keb.getRuntime(instanceID);
  expect(resp.data).to.be.lengthOf(1);

  return resp.data[0].shootName;
}

async function ensureValidOIDCConfigInCustomerFacingKubeconfig(keb, instanceID, oidcConfig) {
  let kubeconfigContent;
  try {
    kubeconfigContent = await keb.downloadKubeconfig(instanceID);
  } catch (err) {}

  var issuerMatchPattern = "\\b" + oidcConfig.issuerURL + "\\b";
  var clientIDMatchPattern = "\\b" + oidcConfig.clientID + "\\b";
  expect(kubeconfigContent).to.match(new RegExp(issuerMatchPattern, "g"));
  expect(kubeconfigContent).to.match(new RegExp(clientIDMatchPattern, "g"));
}

module.exports = {
  provisionSKR,
  deprovisionSKR,
  updateSKR,
  ensureOperationSucceeded,
  getShootName,
  ensureValidShootOIDCConfig,
  ensureValidOIDCConfigInCustomerFacingKubeconfig,
};
