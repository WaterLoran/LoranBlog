Google Test（简称 gtest）是 Google 开源的 C++ 单元测试框架，也是当前**业界最主流、功能最全面**的 C++ 测试框架。它的核心设计哲学是**让编写测试变得轻松愉悦**。

### 📝 Gtest 框架核心优势
与之前提到的 Cpptest 相比，Gtest 的强大之处在于：

1.  **断言系统极其丰富**：除了基础的 `ASSERT_TRUE`，还有针对数值、字符串、容器、异常的专用断言（如 `EXPECT_EQ`, `ASSERT_STREQ`, `EXPECT_THROW`）。
2.  **测试固件支持完善**：通过 `SetUp()`/`TearDown()` 方法为多个测试复用相同的配置环境，非常适合测试同一个类的不同接口。
3.  **强大的参数化测试**：允许使用不同的输入数据运行同一个测试逻辑。
4.  **类型参数化测试**：可以对不同数据类型运行相同的测试逻辑（模板测试）。
5.  **死亡测试**：专门用于测试程序是否按预期方式崩溃（如断言失败）。
6.  **友好的输出**：失败时提供清晰的对比信息（如 `Expected: 5, Actual: 3`）。
7.  **与 Google Mock 无缝集成**：可以直接使用强大的 Mock 框架来隔离测试对象。

### 🧪 一个完整的 Gtest 代码例子
让我们通过一个完整的例子来感受 Gtest 的直观和强大。假设我们有一个待测试的 `Stack` 类。

**1. 待测试的类 (`stack.h`)**
```cpp
#ifndef STACK_H
#define STACK_H

#include <vector>
#include <stdexcept>

template <typename T>
class Stack {
private:
    std::vector<T> elems;

public:
    void push(T const& elem) {
        elems.push_back(elem);
    }

    void pop() {
        if (empty()) {
            throw std::out_of_range("Stack<>::pop(): empty stack");
        }
        elems.pop_back();
    }

    T top() const {
        if (empty()) {
            throw std::out_of_range("Stack<>::top(): empty stack");
        }
        return elems.back();
    }

    bool empty() const {
        return elems.empty();
    }

    size_t size() const {
        return elems.size();
    }
};

#endif // STACK_H
```

**2. 测试代码 (`test_stack.cpp`)**
```cpp
#include "stack.h"
#include <gtest/gtest.h> // 核心头文件

// ==================== 1. 基础测试示例 ====================
// 使用 TEST 宏定义测试用例，第一个参数是测试套件名，第二个是测试用例名
TEST(StackTest, IsEmptyInitially) {
    Stack<int> s;
    // EXPECT_ 系列断言：失败时继续执行后续断言（通常更常用）
    EXPECT_TRUE(s.empty());
    EXPECT_EQ(s.size(), 0); // 断言相等
    // ASSERT_ 系列断言：失败时立即终止当前测试用例
    ASSERT_EQ(s.size(), 0); // 此处功能同 EXPECT_EQ，但语义更严格
}

// ==================== 2. 测试固件示例 ====================
// 当多个测试需要相同的数据配置时，使用测试固件
class StackTestFixture : public ::testing::Test {
protected:
    // 每个测试开始前都会执行的设置函数
    void SetUp() override {
        s1.push(1);
        s1.push(2);
        s2.push(3);
    }

    // 每个测试结束后都会执行的清理函数（可选）
    // void TearDown() override {}

    // 测试固件成员变量，对所有测试可见
    Stack<int> s0; // 空栈
    Stack<int> s1; // 有两个元素的栈
    Stack<int> s2; // 有一个元素的栈
};

// 使用 TEST_F 宏来使用测试固件，第一个参数必须是固件类名
TEST_F(StackTestFixture, PushIncreasesSize) {
    EXPECT_EQ(s0.size(), 0);
    s0.push(42);
    EXPECT_EQ(s0.size(), 1); // 测试 push 后大小是否+1
    EXPECT_EQ(s0.top(), 42); // 测试栈顶元素是否正确
}

TEST_F(StackTestFixture, PopDecreasesSize) {
    int old_size = s1.size();
    s1.pop();
    EXPECT_EQ(s1.size(), old_size - 1);
}

TEST_F(StackTestFixture, TopReturnsLastPushed) {
    ASSERT_FALSE(s2.empty());
    EXPECT_EQ(s2.top(), 3); // 验证栈顶是最后压入的3
}

// ==================== 3. 异常测试示例 ====================
TEST(StackExceptionTest, PopEmptyThrows) {
    Stack<int> s;
    // 断言调用 s.pop() 会抛出 std::out_of_range 异常
    EXPECT_THROW(s.pop(), std::out_of_range);
}

TEST(StackExceptionTest, TopEmptyThrows) {
    Stack<int> s;
    // 也可以断言异常消息中包含特定文本
    try {
        s.top();
        FAIL() << "Expected std::out_of_range"; // 如果没抛出异常，强制失败
    } catch (const std::out_of_range& err) {
        EXPECT_STREQ(err.what(), "Stack<>::top(): empty stack");
    }
}

// ==================== 4. 参数化测试示例 ====================
// 定义参数化测试类
class StackParamTest : public ::testing::TestWithParam<int> {
protected:
    Stack<int> s;
};

// 实例化参数化测试用例，参数值为 {0, 1, 10, 100}
TEST_P(StackParamTest, PushThenTopEqualsParam) {
    int value = GetParam(); // 获取当前参数值
    s.push(value);
    EXPECT_EQ(s.top(), value);
}

INSTANTIATE_TEST_SUITE_P(PushTopTests,
                         StackParamTest,
                         ::testing::Values(0, 1, 10, 100));

// ==================== 主函数 ====================
int main(int argc, char **argv) {
    // 初始化 gtest，解析命令行参数
    ::testing::InitGoogleTest(&argc, argv);
    // 运行所有测试用例
    return RUN_ALL_TESTS();
}
```

**3. 编译与运行**
```bash
# 假设 gtest 已作为库安装（如通过 apt-get install libgtest-dev 或 vcpkg install gtest）
# 方法一：直接链接 gtest 库（推荐）
g++ -std=c++11 -o test_stack test_stack.cpp -lgtest -lgtest_main -pthread

# 方法二：如果使用 gtest_main，可以省略 main 函数，框架会提供默认的 main
# g++ -std=c++11 -o test_stack test_stack.cpp -lgtest -pthread

./test_stack

# 运行特定测试
./test_stack --gtest_filter="StackTest*"        # 运行 StackTest 开头的所有测试
./test_stack --gtest_filter="*Exception*"       # 运行名称含 Exception 的测试
./test_stack --gtest_repeat=2                   # 所有测试重复运行2次
```

**4. 期望的输出**（简化版）：
```
[==========] Running 7 tests from 3 test suites.
[----------] Global test environment set-up.
[----------] 1 test from StackTest
[ RUN      ] StackTest.IsEmptyInitially
[       OK ] StackTest.IsEmptyInitially (0 ms)
...
[----------] 4 tests from StackParamTest/PushTopTests
[ RUN      ] StackParamTest/PushTopTests.PushThenTopEqualsParam/0
[       OK ] StackParamTest/PushTopTests.PushThenTopEqualsParam/0 (0 ms)
...
[==========] 7 tests from 3 test suites ran. (1 ms total)
[  PASSED  ] 7 tests.
```

### 🆚 Gtest 与 Cpptest 的快速对比

| 特性           | **Google Test (Gtest)**        | **Cpptest**                     |
| :------------- | :----------------------------- | :------------------------------ |
| **集成方式**   | 需编译链接库                   | 单头文件，无需链接              |
| **学习曲线**   | 中等，功能多                   | **平缓**，概念少                |
| **断言系统**   | **极其丰富**，针对不同类型优化 | 基础，但够用                    |
| **参数化测试** | **原生支持**，语法清晰         | 不支持                          |
| **测试固件**   | 通过类继承，**功能强大**       | 通过 `setup()/teardown()`，简单 |
| **死亡测试**   | **原生支持**                   | 不支持                          |
| **社区生态**   | **极其活跃**，文档完善         | 小众，维护一般                  |
| **适用场景**   | **中大型项目**，工业级需求     | 小型项目，快速原型，嵌入式      |

### 💡 如何安装与快速开始

**Linux (Ubuntu)**:
```bash
sudo apt-get install libgtest-dev
cd /usr/src/gtest
sudo cmake CMakeLists.txt
sudo make
sudo cp lib/*.a /usr/lib
```

**Mac (Homebrew)**:
```bash
brew install googletest
```

**CMake 集成**（现代项目推荐方式）:
```cmake
cmake_minimum_required(VERSION 3.14)
project(MyProject)

find_package(GTest REQUIRED)
add_executable(run_tests test_stack.cpp)
target_link_libraries(run_tests GTest::gtest GTest::gtest_main)
```

### 🎯 总结与建议

Gtest 的强大在于它**为各种测试场景提供了标准化的解决方案**。如果你正在启动一个**严肃的、需要长期维护的 C++ 项目**，或者项目规模正在增长，Gtest 几乎是毋庸置疑的选择。它的学习成本会在项目的生命周期中通过更高的测试效率、更好的代码质量和更少的调试时间得到回报。

**何时选择 Cpptest？** 仅当你的项目非常小（如单个源文件）、资源极度受限（如嵌入式环境），或者你只是需要一个能在5分钟内集成完毕的临时测试工具。

希望这个详细的例子能帮助你快速上手 Gtest。如果你在特定功能（如 Mock 使用、自定义断言或 CI 集成）上需要更多指导，我很乐意提供进一步的帮助。