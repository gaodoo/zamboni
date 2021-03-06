var purchases = {
    init: function() {
        $("#contribute-why").popup("#contribute-more-info", {
            pointTo: "#contribute-more-info"
        });
        $('div.contribute a.suggested-amount,button.paypal').live('click', function(event) {
            var el = this,
                url = $(el).attr('href') + '&result_type=json',
                classes = 'ajax-loading loading-submit disabled';
            if ($(el).attr('data-realurl')) {
                url += '&realurl=' + encodeURIComponent($(el).attr('data-realurl'));
            }
            $(el).addClass(classes);
            $.ajax({
                url: url,
                dataType: 'json',
                /* false so that the action is considered within bounds of
                 * user interaction and does not trigger the Firefox popup blocker.
                 */
                async: false,
                success: function(json) {
                    $(el).removeClass(classes);
                    $('.modal').trigger('close'); // Hide all modals
                    if (json.paykey) {
                        /* This is supposed to be a global */
                        //dgFlow = new PAYPAL.apps.DGFlow({expType:'mini'});
                        dgFlow = new PAYPAL.apps.DGFlow({clicked: el.id});
                        dgFlow.startFlow(json.url);
                    } else {
                        if (!$('#paypal-error').length) {
                            $(el).closest('div').append('<div id="paypal-error" class="popup"></div>');
                        }
                        $('#paypal-error').text(json.error).popup(el, {pointTo:el}).render();
                    }
                }
            });
            return false;
        });
        purchases.result();
    },
    result: function() {
        /* Process the paypal result page. This is the complete or cancel
         * page. Its main job is to close and take us back to the modal */
        if ($('#paypal-result').length) {
            var top_opener = top;
            if (top.opener && top.opener.top.dgFlow) {
                top_opener = top.opener.top;
            }
            top_dgFlow = top_opener.dgFlow;

            if (top_dgFlow !== null) {
                var thanks_url = $('#paypal-thanks').attr('href');
                if(thanks_url) {
                    top_opener.modalFromURL(thanks_url, {'callback': purchases.thanks});
                }
                top_dgFlow.closeFlow();

                if (top !== null) {
                    top.close();
                }
            }
        }
    },
    reset: function(button) {
        /* This resets the button for this add-on to show that it's been
         * purchased and do the work for add-ons or web apps. */
        var $button = $(button),
            $install = $(button).closest('.install');
        $install.removeClass('premium');
        $button.find('.premium').removeClass('premium');
        if ($install.hasClass('webapp')) {
            $button.text(gettext('Install Web App')).attr('href', '#');
            if (!$install.attr('data-manifest-url')) {
                $.getJSON($install.attr('data-manifest-url-lookup'),
                          function(json) {
                            $.each(json, function() {
                                $install.attr('data-manifest-url', this.manifest_url);
                                $install.installButton();
                            });
                          });
            }
        }
        $install.installButton();
    },
    find_button: function(win) {
        /* Find the relevant button to reset. */
        return $('.install[data-addon=' +
                 $('#addon_info', win).attr('data-addon') +']:visible',
                 win.closest('body')).find('a.button');
    },
    thanks: function() {
        /* Process the thanks modal that we show. */
        // This needs to be bound to this so that callback will get the
        // correct window.
        var $button = purchases.find_button($(this));
        purchases.reset($button);
        purchases.trigger(this);
    },
    trigger: function(modal) {
        /* Trigger the downloads or install when we show the thanks
         * or already purchased pages and wire up click triggers. */
        if ($('.trigger_download', modal).exists()) {
            z.installAddon($('.addon-title', modal).text(),
                           $('.trigger_download', modal).attr('href'));
        } else if ($('.trigger_app_install', modal).exists()) {
            purchases.install_app($('.trigger_app_install', modal).attr('data-manifest-url'));
            $('.trigger_app_install').click(_pd(function() {
                purchases.install_app($(modal).attr('data-manifest-url'));
            }));
        }
    },
    install_app: function(url) {
        /* Try and install the app. */
        if (navigator.mozApps && navigator.mozApps.install) {
            navigator.mozApps.install(url);
        } else {
            // Notify that it can't be installed.
        }
    }
};

$(document).ready(function() {
    purchases.init();
});

/**
 * Contributions Lightbox
 * TODO(jbalogh): save from amo2009.
 */
var contributions = {
    commentlimit: 255, // paypal-imposed comment length limit

    init: function() {
        // prepare overlay content
        var cb = $('#contribute-box');
        var contrib_limit = parseFloat($('#contrib-too-much').attr('data-max-amount'));
        cb.find('li label').click(function(e) {
            e.preventDefault();
            $(this).siblings(':radio').attr('checked', 'checked');
            $(this).children('input:text').focus();
        }).end()
        .find('input:text').keypress(function() {
            $(this).parent().siblings(':radio').attr('checked', 'checked');
        }).end()
        .find('textarea').keyup(function() {
            var txt = $(this).val(),
                limit = contributions.commentlimit,
                counter = $(this).siblings('.commentlen');
            if (txt.length > limit) {
                $(this).val(txt.substr(0, limit));
            }
            counter.text(limit - Math.min(txt.length, limit));
        }).keyup().end()
        .find('#contrib-too-much').hide().end()
        .find('#contrib-too-little').hide().end()
        .find('#contrib-not-entered').hide().end()
        .find('form').submit(function() {
            var contrib_type = $(this).find('input:checked').val();
            if (contrib_type == 'onetime') {
                var amt = $(this).find('input[name="'+contrib_type+'-amount"]').val();
                $(this).find('.error').hide();
                // parseFloat will catch everything except 1@, +amt will though
                if (isNaN(parseFloat(amt)) || ((+amt) != amt)) {
                    $(this).find('#contrib-not-entered').show();
                    return false;
                }
                if (amt > contrib_limit) {
                    $(this).find('#contrib-too-much').show();
                    return false;
                }
                if (parseFloat(amt) < 0.01) {
                    $(this).find('#contrib-too-little').show();
                    return false;
                }
            }
            var $self = $(this);
            $self.find('#contribute-actions').children().toggleClass('js-hidden');
            $.ajax({type: 'GET',
                url: $(this).attr('action') + '?result_type=json',
                data: $(this).serialize(),
                /* So popup blocker doesn't fire */
                async: false,
                success: function(json) {
                    if (json.paykey) {
                        /* This is supposed to be a global */
                        //dgFlow = new PAYPAL.apps.DGFlow({expType:'mini'});
                        dgFlow = new PAYPAL.apps.DGFlow({clicked: 'contribute-box'});
                        dgFlow.startFlow(json.url);
                        $self.find('span.cancel a').click();
                    } else {
                        $self.find('#paypal-error').show();
                    }
                }
            });
            $self.find('#contribute-actions').children().toggleClass('js-hidden');
            return false;
        });

        // enable overlay; make sure we have the jqm package available.
        if (!cb.jqm) {
            return;
        }
        cb.jqm({
                overlay: 100,
                overlayClass: 'contrib-overlay',
                onShow: function(hash) {
                    // avoid bleeding-through form elements
                    if ($.browser.opera) {
                        this.inputs = $(':input:visible').css('visibility', 'hidden');
                    }
                    // clean up, then show box
                    hash.w.find('.error').hide();
                    hash.w
                        .find('input:text').val('').end()
                        .find('textarea').val('').keyup().end()
                        .find('input:radio:first').attr('checked', 'checked').end()
                        .fadeIn();

                },
                onHide: function(hash) {
                    if ($.browser.opera) {
                        this.inputs.css('visibility', 'visible');
                    }
                    hash.w.find('.error').hide();
                    hash.w.fadeOut();
                    hash.o.remove();
                },
                trigger: '#contribute-button',
                toTop: true
            })
            .jqmAddClose(cb.find('.cancel a'));

        if (window.location.hash === '#contribute-confirm') {
            $('#contribute-button').click();
        }
    }

};
