<?php
/**
 * ChatDock Widget — WordPress Integration Example
 *
 * Copy this code into your theme's functions.php, or create a
 * site-specific plugin at: wp-content/plugins/chatdock/chatdock.php
 *
 * Then add [chatdock] to any page, post, or text widget.
 */

// ── 1. Enqueue ChatDock ──────────────────────────────────────────────────────
// Loads the script once per page (regardless of shortcode count).
function chatdock_enqueue_scripts() {
    wp_enqueue_script(
        'chatdock',
        'https://unpkg.com/chatdock/chatdock.js',
        [],        // no dependencies
        '1.0.0',
        true       // load in footer
    );
}
add_action( 'wp_enqueue_scripts', 'chatdock_enqueue_scripts' );


// ── 2. CSS isolation — override WordPress theme styles inside the widget ─────
// WordPress themes inject styles that leak into embedded widgets (paragraph
// margins, link colours, img max-width, button resets, etc.).  Hooking into
// wp_footer at priority 999 guarantees this <style> block is emitted AFTER
// every theme and plugin stylesheet, so these rules win the cascade.
// All rules are scoped to .chatdock-panel so nothing outside the widget is
// affected.
function chatdock_isolation_css() {
    $prefix = '.chatdock-panel';
    ?>
    <style id="chatdock-isolation">
        /* Reset common WordPress theme bleeds scoped to the chatdock widget */
        <?php echo $prefix; ?>,
        <?php echo $prefix; ?> * {
            box-sizing: border-box !important;
            -webkit-box-sizing: border-box !important;
        }
        <?php echo $prefix; ?> p,
        <?php echo $prefix; ?> h1,
        <?php echo $prefix; ?> h2,
        <?php echo $prefix; ?> h3,
        <?php echo $prefix; ?> h4,
        <?php echo $prefix; ?> h5,
        <?php echo $prefix; ?> h6 {
            margin: 0 !important;
            padding: 0 !important;
            font-size: revert !important;
            line-height: normal !important;
            font-weight: revert !important;
            letter-spacing: normal !important;
        }
        <?php echo $prefix; ?> a,
        <?php echo $prefix; ?> a:visited,
        <?php echo $prefix; ?> a:hover {
            color: inherit !important;
            text-decoration: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
        }
        <?php echo $prefix; ?> button,
        <?php echo $prefix; ?> input,
        <?php echo $prefix; ?> textarea,
        <?php echo $prefix; ?> select {
            font-family: inherit !important;
            font-size: inherit !important;
            line-height: normal !important;
            letter-spacing: normal !important;
            text-transform: none !important;
            border-radius: 0 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
        }
        <?php echo $prefix; ?> img {
            max-width: none !important;
            height: auto !important;
            vertical-align: middle !important;
            border: none !important;
        }
        <?php echo $prefix; ?> ul,
        <?php echo $prefix; ?> ol {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        <?php echo $prefix; ?> li {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        <?php echo $prefix; ?> table {
            border-collapse: collapse !important;
            border-spacing: 0 !important;
        }
        <?php echo $prefix; ?> * {
            outline: none !important;
        }
    </style>
    <?php
}
add_action( 'wp_footer', 'chatdock_isolation_css', 999 );


// ── 2. Register [chatdock] shortcode ────────────────────────────────────────
// Supports multiple instances per page via the `id` attribute.
// Usage:  [chatdock]
//         [chatdock id="support-widget"]
function chatdock_shortcode( $atts ) {
    static $n = 0;
    $n++;

    $atts = shortcode_atts(
        [ 'id' => 'chatdock-' . $n ],
        $atts,
        'chatdock'
    );

    $safe_id = esc_attr( $atts['id'] );
    $js_id   = esc_js( $atts['id'] );

    // ── Widget configuration ─────────────────────────────────────────────────
    // Update these values or pull them from your plugin/theme settings.
    $config = wp_json_encode( [
        'chatId'      => 'your-chat-id',
        'apiEndpoint' => 'https://your-api.com/api/chat/your-chat-id',
        'title'       => 'Support Chat',
        'inline'      => true,
        'initialMessage' => 'Hello! How can I help you today? 👋',
        'legalMessage'   => 'AI chatbots can make mistakes. Please verify important information.',
        'starterPrompts' => [
            'What can you help me with?',
            'Tell me more',
            'Get started',
        ],
        'theme' => [
            'primaryColor'       => '#1f6feb',
            'bannerColor'        => '#1f6feb',
            'bannerFontColor'    => '#ffffff',
            'chatBackground'     => '#f9f9f9',
            'userMessageBg'      => '#1f6feb',
            'userMessageFontColor' => '#ffffff',
            'botMessageBg'       => '#e9e9e9',
            'botMessageFontColor' => '#333333',
        ],
        'dimensions' => [
            'width'  => '100%',
            'height' => '520px',
        ],
    ] );

    return '<div id="' . $safe_id . '"></div>'
         . '<script>(function(){'
         . 'var el=document.getElementById("' . $js_id . '");'
         . 'if(!window.ChatDock||!el)return;'
         . 'new ChatDock(Object.assign(' . $config . ',{container:el}));'
         . '})();<\/script>';
}
add_shortcode( 'chatdock', 'chatdock_shortcode' );


// ── Optional: Site-specific plugin header ────────────────────────────────────
// If creating a standalone plugin, add this comment block at the very top
// of your plugin file (wp-content/plugins/chatdock/chatdock.php):
//
// <?php
// /**
//  * Plugin Name: ChatDock Widget
//  * Plugin URI:  https://github.com/Illuminare-Scientia/ChatDock
//  * Description: Embeds a ChatDock / iBlueprint chat widget via [chatdock] shortcode.
//  * Version:     1.0.0
//  * Author:      Your Name
//  * License:     MIT
//  */


// ── Usage ────────────────────────────────────────────────────────────────────
// Basic (auto-numbered container):
//   [chatdock]
//
// Named (for multiple widgets or custom CSS targeting):
//   [chatdock id="support-chat"]
//   [chatdock id="sales-chat"]
//
// In a page template (PHP):
//   echo do_shortcode( '[chatdock id="inline-widget"]' );
