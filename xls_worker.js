var config = {
    transport: new(function() {
        var host = 'https://youtrack.oraclecorp.com/rest';
        this.getIssue = function(issue_id) {
            return $.ajax({
                url: host + '/issue/' + issue_id,
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.createIssue = function(data) {
			console.log(data);
            return $.ajax({
                url: host + '/issue',
                data: data,
                type: 'post',
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.updateIssue = function(issueId, data) {
            return $.ajax({
                url: host + '/issue/' + issueId,
                data: data,
                type: 'post',
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.execCommand = function(issueId, command) {
            var rawCommand = [];
            for (var key in command) {
                if (command[key].map && command[key].length > 1) {
                    rawCommand.push('add ' + key + ' ' + command[key].join(' '));
                } else if (key == 'Assignee') {
                    rawCommand.push(key + ' ' + command[key].join(key + ' '));
                } else {
                    rawCommand.push(key + ' ' + command[key]);
                }
            }
            return $.ajax({
                url: host + '/issue/' + issueId + '/execute',
                data: {
                    command: rawCommand.join(' ')
                },
                type: 'post',
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.transportHandler = function(id, writable) {
            if (id && writable) {
                config.transport.getIssue(id).done(function(data) {
                    console.log(data);
                }).done(function() {
                    config.transport.execCommand(id, {
                        'PA Client Project ID': writable
                    });
                }).done(function() {
                    config.EventsBus.eventBusDo();
                }).fail(function() {
                    console.log('Ajax Request is Failed!')
                });
            }
        };
    })(),
    EventsBus: new(function() {
        var eventBus = [];
        this.eventBusPut = function(obj) {
            eventBus.push(obj);
        };
        this.eventBusDo = function() {
            if (eventBus.length) {
                config.transport.transportHandler.apply(this, [eventBus[0]['id'], eventBus[0]['writable']]);
                eventBus.splice(0, 1);
            } else {
				config.eventManager.trigger('all events off');
			}
        };
    })(),
    eventManager: new(function() {
        var pool = {};
        this.on = function(event, handler) {
            if (!pool[event]) {
                pool[event] = handler;
            }
        };
        this.off = function(event) {
            if (pool[event]) {
                delete pool[event];
            }
        };
        this.trigger = function(event, args) {
            if (pool[event] && typeof pool[event] === 'function') {
                return pool[event].apply(this, args);
            }
        };
    })(),
    sheetNames: [],
    wb: '',
    fnArr: [function(el) {
        $(el).css('background-color') !== "rgba(0, 0, 0, 0)" ?
            $(el).css('background-color', '') :
            $(el).css('background-color', '#CCEEFF');
    }],
    defPreventer: function(e) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
        config.fnArr.forEach(function(i, j) {
            if (typeof i == 'function') {
                i(e.target);
            }
        });
        config.fnArr = [];
    },
    init: function(what) {
        what.forEach(function(el) {
            if ($(el).length) {
                $(el).on('dragover', config.defPreventer);
                $(el).on('dragenter', config.defPreventer);
            }
        });
    },
	
	UserException : function(message) {
		this.message = message;
        this.name = "UserException";
	},
	
    rangeSeeker: function(workSheet /*Final List*/ , columnName /*Oracle Project Name*/ ) {
		var workbook = config.wb['Workbook']['Sheets'];
        var range;
        var letterRanges = [];
		var AllLetterCoordinatesKeys = config.wb.Sheets[workSheet] ? Object.keys(config.wb.Sheets[workSheet]) : 0;
		for (var i = 0; i < AllLetterCoordinatesKeys.length; i++) {
                if (AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/) && AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/)[1] === '1') {
						// if the key has value:
					if(config.wb.Sheets[workSheet][AllLetterCoordinatesKeys[i]] &&
                       config.wb.Sheets[workSheet][AllLetterCoordinatesKeys[i]]['v']) {
						letterRanges.push(AllLetterCoordinatesKeys[i].replace(/\d+/, ''));
					}
                }else if(AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/) && AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/)[1] === '2') {
					break;
				}
            }
        var ref;
        var splitRefArrOf2;
        var upperBoundNum;
        var higherBoundNum;
        var upperBoundLetter;
        var lowerBoundLetter;
        var columnNameLetter;
        workbook.forEach(function(sheet) {
            if (sheet['name'] == workSheet) {
                ref = config.wb.Sheets[sheet['name']]['!ref'];
                splitRefArrOf2 = ref.split(':');
                upperBoundNum = parseInt(config.wb.Sheets[sheet['name']]['!ref'].split(':')[0].match(/\d+/));
                lowerBoundNum = parseInt(config.wb.Sheets[sheet['name']]['!ref'].split(':')[1].match(/\d+/));
                upperBoundLetter = ref.split(':')[0].match(/\D/)[0];
                lowerBoundLetter = ref.split(':')[1].match(/\D/)[0];
                for (var i = letterRanges.length; i--;) {
                    if (config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum] &&
                        config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v']) {
                        if (config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v'] == columnName ||
                            config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v'].includes(columnName)) {
                            range = letterRanges[i] + (upperBoundNum + 1) + ":" + letterRanges[i] + (upperBoundNum + 1);
                        }
                    }
                }
            }
        });
        return range;
    },
    getItemNamesByColumn: function(workSheet, columnName) {
        var workbook = config.wb.Workbook.Sheets;
        if (config.wb.Sheets[workSheet]) {
            var keys = Object.keys(config.wb.Sheets[workSheet]); // issues
            var upperBound = parseInt(config.wb.Sheets[workSheet]['!ref'].split(':')[1].match(/\d+/));
            var returnable = [];
            var theKey = '';
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].match(/^[A-Z]+(\d+)/) && keys[i].match(/^[A-Z]+(\d+)/)[1] === '1') {
                    var _columnName =
                        config.wb.Sheets[workSheet][keys[i]] ?
                        config.wb.Sheets[workSheet][keys[i]]['v'] : '';
                    if (_columnName == columnName) {
                        theKey = keys[i];
                        break;
                    }
                }
            }
            if (theKey) {
                theKey = theKey.replace(/[0-9]+/, '');
                while (upperBound > 1) {
                    config.wb.Sheets[workSheet][theKey + upperBound] &&
                        config.wb.Sheets[workSheet][theKey + upperBound]['v'] ?
                        returnable.push(config.wb.Sheets[workSheet][theKey + upperBound]['v']) : returnable;
                    upperBound--;
                }
            }
            return returnable.length ? returnable.reverse() : null;
        }
    },
    readFile: function(e) {
        if (e.originalEvent.dataTransfer) {
            if (e.originalEvent.dataTransfer.files.length) {
                var files = e.originalEvent.dataTransfer.files;
                config.f = files[0];
                var reader = new FileReader(),
                    name = config.f.name;
                reader.onload = function(e) {
                    var data = e.target.result;
                    config.wb = XLSX.read(data, {
                        type: 'binary'
                    });
                    if (!config.wb.SheetNames.some(function(sheet) {
                            if (~config.sheetNames.indexOf(sheet)) {
                                return true;
                            }
                        })) {
                        config.sheetNames = config.sheetNames.concat(config.wb.SheetNames);
                    }

                    if (!config.sheetNames.length) {
                        throw new config.UserException("The Excel File Seems To Have No Sheets!");
                        $('#drag-and-drop').addClass('failure');
                    }
                    config.eventManager.trigger('onFileRead');
                };
                reader.readAsBinaryString(config.f);
                config.fnArr.push(function(el) {
                    $(el).css('background-color') !== "rgba(0, 0, 0, 0)" ?
                        $(el).css('background-color', '') :
                        $(el).css('background-color', '#CCEEFF');
                });
                config.fnArr.forEach(function(i, j) {
                    if (typeof i == 'function') {
                        i(e.target);
                    }
                });
            }
        }
    }
};

$(document).ready(function() {
    config.init(['#draganddropitemsid']);
    $('#draganddropitemsid').on('drop',
        function(e) {
            config.defPreventer(e);
            config.readFile(e);
            config.eventManager.on('Issue Id', config.getItemNamesByColumn);
            config.eventManager.on('Client Account', config.getItemNamesByColumn);
			config.eventManager.on('PA Client Project ID', config.getItemNamesByColumn);
            config.eventManager.on('transport do', config.transport.transportHandler);
            config.eventManager.on('populate config.Ids2Process', function(pairs) {
                config['Ids2Process'] = [];
                if (pairs && pairs.length) {
                    pairs.forEach(function(pair) {
                        var id = pair['id'];
                        var writable = pair['writable'];
                        config.EventsBus.eventBusPut(pair);
                    });
                }
            });
            config.eventManager.on('onFileRead', function() {
				/* the file with the unique field Issue Id , that is missing in the one generated by CSV file from YT, 
				   should be the first to drad-and-drop */
                if (config.sheetNames.length) {
					var sheet = Object.keys(config.wb['Sheets'])[0];
					config[sheet] = config[sheet] || {};
					if(config.rangeSeeker(sheet, 'Issue Id')) {
						config[sheet]['Issue Id'] = config.eventManager.trigger('Issue Id', [sheet, 'Issue Id']);
					}
					config[sheet]['Client Account'] = config.eventManager.trigger('Client Account', [sheet, 'Client Account']);
					config[sheet]['PA Client Project ID'] = config.eventManager.trigger('PA Client Project ID', [sheet, 'PA Client Project ID']);
					config.eventManager.trigger('getItemNamesByColumn Done', []);
                } else {
                    throw new config.UserException("The Excel File Seems To Have No Sheets!");
                }
            });
            config.eventManager.on('getItemNamesByColumn Done', function() {
					if (config.sheetNames.length == 2) {
						config.eventManager.trigger('Reading All Complete', []);
					}
				});
			}); // on drop ending line
			
			config.eventManager.on('Reading All Complete', function() {
					console.log('Reading All Complete');
					$('#draganddropitemsid').addClass('success');
					var Ids, ClientAcc1, ClientAcc2, Ids2Process = [], PAProjectIDs1, PAProjectIDs2;
					for (var i = 0; i < config.sheetNames.length; i++) {
							if (~Object.keys(config[config.sheetNames[i]]).indexOf('Issue Id')) {
								/*'Issue Id' column is present only in the 1-st file, which is supposed to be dropped first!*/
								Ids = config[config.sheetNames[i]]['Issue Id'];
								ClientAcc1 = config[config.sheetNames[i]]['Client Account'];
								PAProjectIDs1 = config[config.sheetNames[i]]['PA Client Project ID'];
							} else {
								/*working with the 2-nd file, which was dropped last, which has the data for writing*/	
								ClientAcc2 = config[config.sheetNames[i]]['Client Account'];
								PAProjectIDs2 = config[config.sheetNames[i]]['PA Client Project ID'];
							}
					}
					if (Ids && Ids.length) {
						for (var i = 0; i < Ids.length; i++) {
							if (~ClientAcc2.indexOf(ClientAcc1[i]) && (PAProjectIDs1[i] == 'Undefined' || PAProjectIDs1[i] == 'Null' || PAProjectIDs1[i] == '' || PAProjectIDs1[i] == 'null' || PAProjectIDs1[i] == 'undefined') ) {
								var pair = {};
								pair['id'] = Ids[i];
								pair['writable'] = PAProjectIDs2[ClientAcc2.indexOf(ClientAcc1[i])];
								Ids2Process.push(pair);
							}
						}
					}
					
					if(Ids2Process && Ids2Process.length){
						// firing the first ajax from the Ids2Process first pair
						config.eventManager.trigger('transport do', [Ids2Process[0]['id'], Ids2Process[0]['writable']]);
						// splicing the first ajax data from the array of pairs
						Ids2Process.splice(0, 1);
						// populating the EventsBus events pool with the array of pairs after the first ajax call
						config.eventManager.trigger('populate config.Ids2Process', [Ids2Process]);
						// unsubscribing from the EventsBus populating
						config.eventManager.off('populate config.Ids2Process');
					}else{
						 throw new config.UserException('Ids2Process is empty: nothing to process!');
					}
					
    }); // the end of 'Reading All Complete' line
	
			config.eventManager.on('all events off', function() {
					config.eventManager.off('Issue Id');
					config.eventManager.off('PA Client Project ID');
					config.eventManager.off('Client Account');
					config.eventManager.off('transport do');
					config.eventManager.off('populate config.Ids2Process');
					config.eventManager.off('onFileRead');
					config.eventManager.off('getItemNamesByColumn Done');
					config.eventManager.off('Reading All Complete');
			});
	
});
