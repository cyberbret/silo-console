module.exports = {
  hooks: {
    onInsertPathParam: (paramName) => `encodeURIComponent(${paramName})`,
    onCreateComponent: (component) => {
      if (component.typeName === "updateGroupRequest") {
        // Go must serialize [] rather than omit an explicit membership clear.
        // This Go serialization hint does not make the field required on the
        // wire; let the TS generator use the schema's required list instead.
        delete component.rawTypeData.properties.members["x-omitempty"];
      }
      return component;
    },
  },
};
