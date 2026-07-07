Cpptest 是一个轻量级的 C++ 单元测试框架，其核心设计哲学是 **简单、直接**。它的目标是让开发者能够快速编写和运行测试，而无需复杂的配置或依赖。

### 📝 Cpptest 框架核心特点

1.  **单头文件**：只需包含一个头文件 (`cpptest.h`)，无需链接复杂的库。
2.  **直观的测试组织**：通过继承 `Test::Suite` 类来创建测试套件，在**构造函数**中使用 `TEST_ADD` 宏来注册测试方法。
3.  **丰富的断言**：提供 `TEST_ASSERT`, `TEST_ASSERT_MSG`, `TEST_ASSERT_DELTA`（用于浮点数比较）等宏。
4.  **灵活的测试夹具**：通过重写 `setup()` 和 `teardown()` 方法，可以为每个测试用例或整个套件设置前置/后置条件。
5.  **多种输出格式**：支持文本、编译器兼容格式和HTML格式的报告。

### 🧪 一个简单的代码例子

下面是一个完整的、可编译运行的例子，演示了如何测试一个简单的 `Calculator` 类。

**1. 待测试的类 (`calculator.h`)** 
```cpp
// calculator.h
#ifndef CALCULATOR_H
#define CALCULATOR_H

class Calculator {
public:
    int add(int a, int b) { return a + b; }
    int subtract(int a, int b) { return a - b; }
    double divide(int a, int b) {
        if (b == 0) throw std::runtime_error("Division by zero!");
        return static_cast<double>(a) / b;
    }
};

#endif
```

**2. 测试代码 (`test_calculator.cpp`)** 
```cpp
// test_calculator.cpp
#include "calculator.h"
#include <cpptest.h> // 核心：包含这一个头文件就够了
#include <iostream>

// 1. 定义测试套件，必须继承自 Test::Suite
class CalculatorTestSuite : public Test::Suite {
public:
    CalculatorTestSuite() {
        // 2. 在构造函数中，使用 TEST_ADD 宏绑定测试方法
        TEST_ADD(CalculatorTestSuite::test_add);
        TEST_ADD(CalculatorTestSuite::test_subtract);
        TEST_ADD(CalculatorTestSuite::test_divide_normal);
        TEST_ADD(CalculatorTestSuite::test_divide_by_zero);
    }

private:
    // 3. 声明测试方法（它们将被 TEST_ADD 注册）
    void test_add() {
        Calculator calc;
        // 最基本的断言：验证 add 方法结果是否正确
        TEST_ASSERT(calc.add(2, 3) == 5);
        TEST_ASSERT(calc.add(-1, 1) == 0);
    }

    void test_subtract() {
        Calculator calc;
        TEST_ASSERT(calc.subtract(5, 3) == 2);
        TEST_ASSERT(calc.subtract(3, 5) == -2);
        // 带消息的断言，失败时会打印消息
        TEST_ASSERT_MSG(calc.subtract(0, 0) == 0, "0-0 should be 0");
    }

    void test_divide_normal() {
        Calculator calc;
        // 浮点数比较：断言 10/4 等于 2.5，允许误差 0.0001
        TEST_ASSERT_DELTA(calc.divide(10, 4), 2.5, 0.0001);
    }

    void test_divide_by_zero() {
        Calculator calc;
        // 断言：期待调用 calc.divide(5,0) 时，抛出 std::runtime_error 异常
        TEST_THROWS(calc.divide(5, 0), std::runtime_error);
    }

    // 4. (可选) 测试夹具：每个测试方法运行前后都会调用
    void setup() override {
        // 可以在这里初始化一些每个测试共用的资源
        std::cout << "Setting up for a test..." << std::endl;
    }
    void teardown() override {
        // 在这里清理资源
        std::cout << "Tearing down after a test." << std::endl;
    }
};

int main() {
    // 5. 创建测试套件对象
    CalculatorTestSuite tests;

    // 6. 运行测试，并选择输出报告格式
    //    这里使用“详细”的文本格式输出到控制台
    Test::TextOutput output(Test::TextOutput::Verbose);

    // 7. 执行 run 方法，返回 true 表示所有测试通过
    bool success = tests.run(output);

    // 8. 根据测试结果返回退出码 (0 成功，非 0 失败)
    //    这便于在 CI/CD 等自动化流程中判断测试状态
    return success ? 0 : 1;
}
```

**3. 编译与运行**
```bash
# 假设你的环境已经配置好，并且 cpptest.h 在编译路径中
g++ -std=c++11 -I. -o test_runner test_calculator.cpp
./test_runner
```

**4. 期望的输出**（如果所有测试通过）：
```
Setting up for a test...
Tearing down after a test.
CalculatorTestSuite::test_add: OK
Setting up for a test...
Tearing down after a test.
CalculatorTestSuite::test_subtract: OK
...
Summary: 4 tests passed, 0 failed, 0 skipped.
```

### 🆚 与其他框架的简单对比

| 特性           | Cpptest                        | Google Test (gtest)                            |
| :------------- | :----------------------------- | :--------------------------------------------- |
| **集成复杂度** | **极简**，单头文件             | 需要编译、链接库                               |
| **学习曲线**   | **平缓**，API直观              | 中等，功能多，概念也多                         |
| **功能丰富性** | 基础：断言、套件、夹具         | **强大**：参数化、类型化测试、死亡测试、Mock等 |
| **社区生态**   | 小众，维护一般                 | **主流**，文档齐全，社区活跃                   |
| **适用场景**   | 小型项目，快速原型，嵌入式环境 | 中大型项目，需要严格测试框架                   |

### 💡 总结与建议

Cpptest 就像一个精巧的瑞士军刀，在需要快速验证逻辑、不想引入复杂依赖时非常顺手。**如果你的项目规模不大，或者你希望以最小的代价为C++代码引入单元测试，Cpptest是一个绝佳的起点。**

然而，对于需要参数化测试、复杂Mock或深度集成的**大型、长期项目**，**Google Test** 因其强大的功能和工业级的稳定性，通常是更专业和可靠的选择。

希望这个例子能帮助你快速上手。如果你在集成或编写特定类型的测试时遇到问题，可以随时提出。