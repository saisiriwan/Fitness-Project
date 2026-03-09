import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FitnessApp());
}

class FitnessApp extends StatelessWidget {
  const FitnessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fitness Dashboard',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  // 10.0.2.2 = host machine localhost from inside Android Emulator
  // Change port to match whichever React app you want to show
  static const String _reactUrl = 'http://10.0.2.2:3000';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // 💥 [CRITICAL FIX] Spoof User-Agent so Google allows login inside the WebView
      ..setUserAgent("Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36")
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
          onWebResourceError: (error) {
            debugPrint('WebView error [${error.errorCode}]: ${error.description}');
          },
          // Intercept navigation requests
          onNavigationRequest: (NavigationRequest request) {
            final url = request.url;

            // 💥 [CRITICAL FIX] Intercept Google Auth redirect returning to localhost and swap it to 10.0.2.2 
            if (url.startsWith('http://localhost:')) {
              final newUrl = url.replaceFirst('localhost', '10.0.2.2');
              debugPrint('Intercepted localhost redirect, changing to: $newUrl');
              _controller.loadRequest(Uri.parse(newUrl));
              // Block the original localhost request
              return NavigationDecision.prevent;
            }

            // Allow normal WebView navigation
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(_reactUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }
}
