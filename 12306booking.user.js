/*
 *  12306 Auto Query => A javascript snippet to help you book tickets online.
 *  12306 Booking Assistant
 *  Copyright (C) 2011 Hidden
 * 
 *  12306 Auto Query => A javascript snippet to help you book tickets online.
 *  Copyright (C) 2011 Jingqin Lynn
 * 
 *  12306 Auto Login => A javascript snippet to help you auto login 12306.com.
 *  Copyright (C) 2011 Kevintop
 * 
 *  Includes jQuery
 *  Copyright 2011, John Resig
 *  Dual licensed under the MIT or GPL Version 2 licenses.
 *  http://jquery.org/license
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 * 
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 * 
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

// ==UserScript==  
// @name         12306 Booking Assistant
// @version		 2.0.1
// @author       zzdhidden@gmail.com
// @namespace    https://github.com/zzdhidden
// @description  12306 订票助手之(自动登录，自动查票，自动订单)
// @include      *://dynamic.12306.cn/otsweb/*
// @require	https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// ==/UserScript== 

function withjQuery(callback, safe)
{
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.textContent = "(" + callback.toString() + ")(window.jQuery, window);";
	document.head.appendChild(script);
}

withjQuery(function($, window)
{	
	// 用户点击任意位置时，请求系统广播权限
	$(document).click(function() 
	{
		// 请求系统广播权限，需要用户授权
		if( window.webkitNotifications && window.webkitNotifications.checkPermission() != 0 ) 
		{
			window.webkitNotifications.requestPermission();
		}
	});
	
	// 发出广播消息
	function notify(str, timeout, skipAlert) 
	{
		// 如果浏览webkit广播消息可用，则使用浏览器广播，否则直接alert显示消息
		if( window.webkitNotifications && window.webkitNotifications.checkPermission() == 0 ) 
		{
			var notification = webkitNotifications.createNotification(
				"http://www.12306.cn/mormhweb/images/favicon.ico",  // icon url - can be relative
				'订票',  // notification title
				str
			);
			notification.show();
			if ( timeout ) 
			{
				setTimeout(function() 
				{
					notification.cancel();
				}, timeout);
			}
			return true;
		} 
		else 
		{
			if( !skipAlert ) 
			{
				alert( str );
			}
			return false;
		}
	}
	
	// 如果网页地址包含match字段，则执行fn函数
	function route(match, fn) 
	{
		if( window.location.href.indexOf(match) != -1 ) 
		{
			fn();
		};
	}


	function query() 
	{
		//query
        var maxIncreaseDay  = 0 ;
        var start_autoIncreaseDay = null ;
        var index_autoIncreaseDay = 1 ;
        var pools_autoIncreaseDay = []  ;
		
		// 重置循环天数为1天，最大循环天数为10天
        function  __reset_autoIncreaseDays()
		{
            maxIncreaseDay   = parseInt( document.getElementById('autoIncreaseDays').value ) || 1 ;
            if( maxIncreaseDay > 10 ) 
			{
                maxIncreaseDay  = 10 ;	//TODO: 根据铁道部最新消息做适当修改
            }
            document.getElementById('autoIncreaseDays').value   = maxIncreaseDay ;
            start_autoIncreaseDay   = null ;
			
			// 下一天、前一天连接设置为灰色
            $('#app_next_day,#app_pre_day').addClass('disabled').css('color', '#aaa' );
        }
		
		// 恢复下一天、前一天按钮颜色
        function  __unset_autoIncreaseDays()
		{
            if( start_autoIncreaseDay ) 
			{
                document.getElementById('startdatepicker').value    = start_autoIncreaseDay ;
                start_autoIncreaseDay   = null ;
            }
            $('#app_next_day,#app_pre_day').removeClass('disabled').css('color', '#000' );
        }
		
		// 把Date对象格式化为YYYY-MM-DD
        function __date_format( date ) 
		{
                var y   = date.getFullYear() ;
                var m   = date.getMonth() + 1 ;
                var d   =  date.getDate() ;
                if( m <= 9 ) 
				{
                    m = '0' + String( m ) ;
                } 
				else 
				{
                    m = String(  m ) ;
                }
				
                if( d <= 9 ) 
				{
                    d = '0' + String(  d ) ;
                } 
				else 
				{
                    d = String( d );
                }
                return  String(y) + '-' + m + '-' + d ;
        }
		
		// YYYY-MM-DD格式的字符串解析成Date对象
        function __date_parse(txt)
		{
                var a  =  $.map(txt.replace(/^\D+/, '').replace(/\D$/, '' ).split(/\D+0?/) , function(i)
				{
                    return parseInt(i) ;
                }) ;
                a[1]    -= 1 ;
                var   date  = new Date;
                date.setFullYear(  a[0]    ) ;
                date.setMonth( a[1]  , a[2]  ) ;
                date.setDate( a[2] ) ;
                return date ;
        }
		
		// 在最大天数限制条件下自动修改出发日期
        function  __set_autoIncreaseDays() 
		{
			// 初始化脚本日期
            if( !start_autoIncreaseDay ) 
			{
				// 获取出发日期时间
                start_autoIncreaseDay   =  document.getElementById('startdatepicker').value ;
				
				// 把DatePicker日期字符串解析成Date对象
                var date = __date_parse(start_autoIncreaseDay);
				
				// 存储maxIncreaseDay天数的Date对象
                pools_autoIncreaseDay  = new Array() ;
                for(var i = 0 ; i < maxIncreaseDay  ; i++) 
				{
                    pools_autoIncreaseDay.push(  __date_format(date) ) ;
                    date.setTime(  date.getTime() + 3600 * 24 * 1000 ) ;
                }
                index_autoIncreaseDay = 1 ; 
                return ;
            }
			
			// 自动从头循环
            if( index_autoIncreaseDay >= pools_autoIncreaseDay.length ) 
			{
                index_autoIncreaseDay   = 0 ;
            }
			
			// 逐天递增模式重置DatePicker日期
            var value   = pools_autoIncreaseDay[index_autoIncreaseDay++];
             document.getElementById('startdatepicker').value   = value ;
        }
		
		// 获取发车时间限制条件：四个元素的数组[minH, minM, maxH, maxM]
        function getTimeLimitValues()
		{
							// 小时下限						// 分钟下限					// 小时上限					// 分钟上限
            return $.map(  [ $('#startTimeHFrom').val()  , $('#startTimeMFrom').val(), $('#startTimeHTo').val(), $('#startTimeMTo').val() ] , function(val)
			{
                return parseInt(val) || 0 ;
            }) ;
        }
        
		var isTicketAvailable = false;
		var firstRemove = false;

		window.$ && window.$(".obj:first").ajaxComplete(function() 
		{
            var  _timeLimit = getTimeLimitValues();
			//window.console.log(this);
			
			// 检测后台返回HTML是否包含有票信息，有票则高亮行
			$(this).find("tr").each(function(n, e) 
			{
				if(checkTickets(e, _timeLimit, n ))
				{
					isTicketAvailable = true;
					highLightRow(e);
				}	
			});
			
			if(firstRemove) 
			{
				firstRemove = false;
				if (isTicketAvailable) 
				{
					if (isAutoQueryEnabled)
					{
						// 自动点击绿色刷票按钮重复刷票
						document.getElementById("refreshButton").click();
					}
					
					// 发出广播消息
					//onticketAvailable(); //report
				}
				else 
				{
					//wait for the button to become valid
				}
			}
		}).ajaxError(function() 
		{
			// 如果遇到错误，则自动重复请求
			if(isAutoQueryEnabled) doQuery();
		});

		//hack into the validQueryButton function to detect query
		var _delayButton = window.delayButton;

		window.delayButton = function() 
		{
			_delayButton();
			if(isAutoQueryEnabled) doQuery();
		}

		//Trigger the button
		var doQuery = function() 
		{
			// 刷新次数显示
			displayQueryTimes(queryTimes++);
			
			firstRemove = true;
			
			// 自动推移出发日期
            __set_autoIncreaseDays();
			
			// 自动点击蓝色查询按钮刷票
			document.getElementById(isStudentTicket ? "stu_submitQuery" : "submitQuery").click();
		}

		var $special = $("<input type='text' />")	
		//add by 冯岩 begin 2012-01-18
		var $specialOnly = $("<label style='margin-left:10px;color: blue;'><input type='checkbox'  id='__chkspecialOnly'/>仅显示限定车次<label>");
		var $includeCanOder = $("<label style='margin-right:10px;color: blue;'><input type='checkbox' id='__chkIncludeCanOder'/>显示可预定车次<label>");
		//add by 冯岩 end 2012-01-18
		var checkTickets = function(row, time_limit , row_index ) 
		{

			var hasTicket = false;
			var v1 = $special.val();			
			var removeOther = $("#__chkspecialOnly").attr("checked");
			var includeCanOder = $("#__chkIncludeCanOder").attr("checked");
			if( v1 ) 
			{
				var v2 = $.trim( $(row).find(".base_txtdiv").text() ); // 查找火车班次字段
				if( v1.indexOf( v2 ) == -1 ) 
				{
					//add by 冯岩 begin 2012-01-18
					if(removeOther)
					{
						if(v2 != "")
						{
							if(includeCanOder)
							{
								//包括其他可以预定的行
								if($(row).find(".yuding_u").size() == 0)
								{
									$(row).remove(); // 删除不可预订的结果
								}
							}
							else
							{
								$(row).remove(); // 删除所有不符合指定班次的结果
							}
						}
					}
					//add by 冯岩 end 2012-01-18
					return false;
				}
			}

			if( $(row).find("td input.yuding_x[type=button]").length ) 
			{
				return false;
			}
           
            var cells  = $(row).find("td") ;
            if( cells.length < 5 ) 
			{
                return false ;
            }
			
			// 起始站点发车时间
            var _start_time = $.map(  $(cells[1]).text().replace(/^\D+|\D+$/, '').split(/\D+0?/) , function(val)
			{
               return parseInt(val) || 0 ; 
            }) ;
            
			// 剔除站点包含数字的无效数字
            while( _start_time.length > 2 ) 
			{
                _start_time.shift() ; // remove station name include number 
            }
			
			// h < minH || h > maxH
            if( _start_time[0] < time_limit[0] ||  _start_time[0]  > time_limit[2] ) 
			{
                return false ;
            }
			
			// h == minH && m < minM
            if( _start_time[0] == time_limit[0] && _start_time[1]  <  time_limit[1] )
			{
                return false ;
            }
			
			// h == maxH && m > maxM
            if( _start_time[0] == time_limit[2] && _start_time[1]  >  time_limit[3] )
			{
                return false ;
            }
            
			// 高亮显示有票单元格
			cells.each(function(i, e) 
			{
				if(ticketType[i-1]) // 有复选框的列如果有票则高亮显示
				{
					var info = $.trim($(e).text());
					if(info != "--" && info != "无" && info != "*") 
					{
						hasTicket = true;
						highLightCell(e);
					}
				}
			});

			return hasTicket;
		}


		var queryTimes = 0; //counter
		var isAutoQueryEnabled = false; //enable flag

		//please DIY:
		var audio = null;

		// 可以订票时弹窗系统浮层消息，并播放音乐
		var onticketAvailable = function() 
		{
			if(window.Audio) 
			{
				if(!audio) 
				{
					audio = new Audio("http://www.w3school.com.cn/i/song.ogg");
					audio.loop = true;
				}
				audio.play();
				notify("可以订票了！", null, true);
			} 
			else 
			{
				notify("可以订票了！");
			}
		}
		
		// 淡蓝色高亮行
		var highLightRow = function(row) 
		{
			$(row).css("background-color", "#D1E1F1");
		}
		
		// 翠绿色高亮单元格
		var highLightCell = function(cell) 
		{
			$(cell).css("background-color", "#2CC03E");
		}
		
		// 显示重试次数
		var displayQueryTimes = function(n) 
		{
			document.getElementById("refreshTimes").innerHTML = n;
		};

		var isStudentTicket = false;

		// 使用链式写法注入hack用户交互UI控件
		var ui = $("<div>请先选择好出发地，目的地，和出发时间。&nbsp;&nbsp;&nbsp;</div>")
			.append( // 添加学生票复选框change事件
				$("<input id='isStudentTicket' type='checkbox' />").change(function()
				{
					isStudentTicket = this.checked ;
				})
			)
			.append( // 添加学生票标签
				$("<label for='isStudentTicket'></label>").html("学生票&nbsp;&nbsp;")
			)
            .append( // 添加逐天搜索输入框，默认值为1
				$("<input id='autoIncreaseDays' type='text' value='1'  maxLength=2 style='width:18px;' />") 
			)
			.append( // 添加循环天数标签
				$("<label for='autoIncreaseDays'></label>").html("天循环&nbsp;&nbsp;")
			)
			.append( // 添加开始刷票绿色按钮
				$("<button style='padding: 5px 10px; background: #2CC03E;border-color: #259A33;border-right-color: #2CC03E;border-bottom-color:#2CC03E;color: white;border-radius: 5px;text-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);'/>").attr("id", "refreshButton").html("开始刷票").click(function() 
				{
					if(!isAutoQueryEnabled) 
					{
                        __reset_autoIncreaseDays() ;
						isTicketAvailable = false;
						if(audio && !audio.paused) audio.pause();
						isAutoQueryEnabled = true;
						doQuery();
						this.innerHTML="停止刷票";
					}
					else 
					{
                        __unset_autoIncreaseDays();
						isAutoQueryEnabled = false;
						this.innerHTML="开始刷票";
					}
				})
			)
			.append( // 添加尝试次数显示标签
				$("<span>").html("&nbsp;&nbsp;尝试次数：").append(
					$("<span/>").attr("id", "refreshTimes").text("0")
				)
			)
			.append( 
				// 添加车票过滤选项
				$("<div>如果只需要刷特定的票种，请在余票信息下面勾选。</div>")
					.append($("<a href='#' style='color: blue;'>只勾选坐票&nbsp;&nbsp;</a>").click(function() 
					{
						// 坐票过滤选项
						$(".hdr tr:eq(2) td").each(function(i,e) 
						{
							var val = this.innerHTML.indexOf("座") != -1;
							var el = $(this).find("input").attr("checked", val);
							el && el[0] && ( ticketType[el[0].ticketTypeId] = val );
						});
						return false;
					}))
					.append($("<a href='#' style='color: blue;'>只勾选卧铺&nbsp;&nbsp;</a>").click(function() 
					{
						// 卧铺过滤选项
						$(".hdr tr:eq(2) td").each(function(i,e) 
						{
							var val = this.innerHTML.indexOf("卧") != -1;
							var el = $(this).find("input").attr("checked", val);
							el && el[0] && ( ticketType[el[0].ticketTypeId] = val );
						});
						return false;
					}))
			)
			.append( // 出发车次过滤输入框
				$("<div>限定出发车次：</div>")
					.append( $special )
					.append( $specialOnly)
					.append( $includeCanOder )
					.append( "不限制不填写，限定多次用逗号分割,例如: G32,G34" )
			);
		var container = $(".cx_title_w:first");
		container.length ?
			ui.insertBefore(container) : ui.appendTo(document.body);
        
		// 链式写法注入日期翻页按钮：前一天、下一天
        $('<div style="position:relative;top:0px; left:0px; height:0px; width:1px; overflow:visiable; background-color:#ff0;"></div>')
                .append(// 添加前一天按钮
                        $('<a id="app_pre_day" style="position:absolute;top:26px; left:2px; width:40px; color:#000;">前一天</a>').click(function() 
						{
                            if( $(this).hasClass("disabled") ) 
							{
                                return false ;
                            }
                            var date = __date_parse( document.getElementById('startdatepicker').value );
                            date.setTime(  date.getTime() - 3600 * 24 * 1000 ) ;
                            document.getElementById('startdatepicker').value    =  __date_format(date)  ;
                            return false;
                        })
                    )
                .append(// 添加下一天按钮
                        $('<a id="app_next_day"  style="position:absolute;top:26px; left:114px; width:40px; color:#000;">下一天</a>').click(function() 
						{
                            if( $(this).hasClass("disabled") ) 
							{
                                return false ;
                            }
                            var date = __date_parse( document.getElementById('startdatepicker').value );
                            date.setTime(  date.getTime() + 3600 * 24 * 1000 ) ;
                            document.getElementById('startdatepicker').value    =  __date_format(date)  ;
                            return false;
                        })
                    )
                .insertBefore( $('#startdatepicker') ) ;
  
        setTimeout(function()
		{
            var box = $('<div style="position:relative;top:2px; left:0px; width:100px; height:18px; line-height:18px;  font-size:12px; padding:0px; overflow:hidden;"></div>') ;
			
			// 创建一个下拉框
            function makeSelect(id, max_value, default_value)
			{
                var element  = $('<select id="' + id + '" style="margin:-2px 0px 0px -5px;padding:0px;font-size:12px; line-height:100%; "></select>') ;
                for(var i = 0; i <= max_value ; i++) 
				{
                    element.append(
                       $('<option value="' + i + '" style="padding:0px;margin:0px;font-size:12px; line-height:100%;" ' + ( default_value == i ? ' selected="selected" ' : '' ) + '>' + ( i <= 9 ? '0' + i : i ) + '</option>' )
                    )
                }
                box.append(
                    $('<div style="width:18px; padding:0px; overflow:hidden; float:left;"></div>') .append(element)
                );
                return element ;
            }
			
			// 出发时间边界检查
            function check(evt)
			{
                var tl  = getTimeLimitValues() ;
                if( tl[0] > tl[2] || (tl[0] == tl[2]  && tl[1] > tl[3]) ) 
				{
                    alert('最早发车时间必须早于最晚发车时间，请重新选择！') ;
                    return false ;
                }
            }
			
            makeSelect('startTimeHFrom' , 23 ).change(check) ;		// 生成出发时间24小时下拉框
            box.append( $('<div style="float:left;">:</div>')) ;	
            makeSelect('startTimeMFrom' , 59 ).change(check) ;		// 生成出发时间60分钟下拉框
            box.append( $('<div style="float:left;padding:0px 1px;">--</div>')) ;
            makeSelect('startTimeHTo' , 23, 23 ).change(check) ;	// 生成到达时间24小时下拉框
            box.append( $('<div style="float:left;">:</div>')) ;
            makeSelect('startTimeMTo' , 59, 59 ).change(check) ;	// 生成到达时间60分钟下拉框
            
            box.insertAfter(  $('#startTime') )
   
        }, 10 ) ;
        
		//Ticket type selector & UI
		var ticketType = new Array();
        var checkbox_list   = new Array();
		
		// 在查票结果栏添加过滤器复选框
		$(".hdr tr:eq(2) td").each(function(i,e) 
		{
			ticketType.push(false);
			if(i<3) return;
			ticketType[i] = true;
			
			// 从第4个开始添加复选框
			var c = $("<input/>").attr("type", "checkBox").attr("checked", true);
			c[0].ticketTypeId = i;
			c.change(function() 
			{
				ticketType[this.ticketTypeId] = this.checked;
			}).appendTo(e);
            checkbox_list.push(c);
		});
		
		// 默认前两个复选框取消选择
        $.each([1, 2 ], function(){
            var c   = checkbox_list.pop() ;
            c[0].checked    = false ;
            ticketType[ c[0].ticketTypeId ] = this.checked ;
        });
        delete checkbox_list ;
	}

	route("querySingleAction.do", query);
	
	
	route("confirmPassengerAction.do", submit);
	//route("confirmPassengerResignAction.do", submit);
	
	// 订票提交处理
	function submit() 
	{
		/**
		 * Auto Submit Order
		 * From: https://gist.github.com/1577671
		 * Author: kevintop@gmail.com  
		 */	
		 window.$(document).ajaxComplete(function(evt, xhr, settings)
		 {			 
			 if (settings.url.indexOf("confirmPassengerAction.do?method=getpassengerJson") < 0) return;
			 $("input._checkbox_class:first").click();
		 });
		 
		 var count = 1;
		 var domain = "https://dynamic.12306.cn/otsweb/order";
		
		// 订票操作
		var userInfoUrl = domain + '/myOrderAction.do?method=queryMyOrderNotComplete&leftmenu=Y&fakeParent=true';
		
		$(".tj_btn").append($("<a href='#' class='button_a' style='padding: 0px 15px 4px;height:23px; background: #2CC03E;border-color: #259A33;border-right-color: #2CC03E;border-bottom-color:#2CC03E;color: white;border-radius: 5px;text-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);'/>").attr("id", "refreshButton").html("快速提交订单").click(function()
		{
			queueOrder('dc');
		}));
		
		// 监听xhr返回
		window.$(document).ajaxComplete(function(evt, xhr, settings)
		{
			if (settings.url.indexOf("confirmPassengerAction.do?method=confirmSingleForQueue") < 0) return;
				
			var data = JSON.parse(xhr.response);
			var msg = data.errMsg;
				
			if (msg != "Y")
			{
				if (msg.indexOf("验证码") >= 0)
				{
					$("#img_rrand_code").click();
					$("#rand").focus();
					stop();
				}
				else
				{
					console.log(msg);
				}
			}
			else
			{
				var audio;
				if( window.Audio ) 
				{
					audio = new Audio("http://www.w3school.com.cn/i/song.ogg");
					audio.loop = true;
					audio.play();
				}

				notify("恭喜，车票预订成！", null, true);

				setTimeout(function() 
				{
					if( confirm("车票预订成，去付款？") )
					{
						window.location.replace(userInfoUrl);
					} 
					else 
					{
						if(audio && !audio.paused) audio.pause();
					}
				}, 100);
			}
				
			console.log(count + "#" + settings.url + "#" + xhr.response);
		});
	};
}, true);
