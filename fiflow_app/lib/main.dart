import 'package:flutter/material.dart';
import 'pages/main_page.dart';
import 'pages/manage_stocks_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _showManageStocks = false;

  void _goToManageStocks() {
    setState(() {
      _showManageStocks = true;
    });
  }

  void _goToMainPage() {
    setState(() {
      _showManageStocks = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FIFlow',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: _showManageStocks
          ? ManageStocksPage(onBack: _goToMainPage)
          : MainPage(onManageStocks: _goToManageStocks),
    );
  }
} 