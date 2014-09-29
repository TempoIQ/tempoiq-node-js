'use strict';

function Query(selection, fold, action) {
  this.selection = selection;
  this.fold = fold;
  this.action = action;
}

Query.prototype.toJSON = function() {
  var json = {
    search: {
      select: "devices",
      filters: this.selection
    }
  };
  
  if (this.fold != null) {
    json['fold'] = fold;
  }

  json[this.action.name] = this.action.value;

  return json;
}

module.exports = Query;
