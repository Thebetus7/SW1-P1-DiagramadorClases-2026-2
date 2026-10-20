import 'package:flutter/material.dart';
import 'screens/link_entry_screen.dart';
import 'state/diagram_viewer_controller.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DiagramCompanionApp());
}

class DiagramCompanionApp extends StatefulWidget {
  const DiagramCompanionApp({super.key});

  @override
  State<DiagramCompanionApp> createState() => _DiagramCompanionAppState();
}

class _DiagramCompanionAppState extends State<DiagramCompanionApp> {
  late final DiagramViewerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = DiagramViewerController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UML Companion Viewer',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate 900
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1), // Indigo 500
          brightness: Brightness.dark,
          surface: const Color(0xFF1E293B), // Slate 800
          primary: const Color(0xFF6366F1),
          secondary: const Color(0xFF10B981), // Emerald 500
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E293B),
          elevation: 0,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF1E293B),
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      home: LinkEntryScreen(controller: _controller),
    );
  }
}
