**Mockito 是什么？**

Mockito 是一个流行的、开源的 **Java 测试框架**，主要用于**创建和管理 Mock 对象**。它的核心目的是帮助开发者编写**清晰、简洁且可维护的单元测试**，特别是在测试代码需要与**外部依赖**（如数据库、网络服务、复杂对象、第三方库等）交互时。

**Mockito 的核心目的：隔离被测代码**

单元测试的核心原则之一是**隔离**。你只想测试你正在编写的特定类或方法（被测系统 - SUT）的逻辑是否正确，而不希望测试结果受到它所依赖的其他组件（协作者）的行为或状态的影响。这些依赖可能：

1.  **不可用或不稳定**：比如数据库未启动、网络服务宕机。
2.  **执行缓慢**：比如真实的数据库查询或远程 API 调用会拖慢测试速度。
3.  **行为难以触发**：比如模拟一个抛出的特定异常。
4.  **状态不可控**：比如依赖一个当前时间或随机数生成器。
5.  **尚未实现**：比如你正在采用测试驱动开发（TDD）。

Mockito 通过创建这些依赖的 **“模拟” (Mock) 或“存根” (Stub)** 来解决这些问题。你可以**控制**这些模拟对象的行为（返回什么值、是否抛出异常），并**验证**你的被测代码是否以预期的方式与这些模拟对象进行了交互。

**Mockito 的核心功能与概念**

1.  **创建 Mock 对象：**
    *   使用 `Mockito.mock(Class<T> classToMock)` 方法创建指定类或接口的 Mock 对象。
    *   例如：`List mockedList = mock(List.class);`

2.  **设定 Mock 行为 (Stubbing)：**
    *   使用 `Mockito.when(mock.someMethod(...)).thenReturn(value)` 来指定当 Mock 对象的某个方法被以特定参数调用时应该返回什么值。
    *   例如：`when(mockedList.get(0)).thenReturn("first");` (当调用 `mockedList.get(0)` 时返回 `"first"`)
    *   使用 `thenThrow(exception)` 来模拟方法抛出异常。
    *   使用 `thenAnswer` 来实现更复杂的自定义返回逻辑。
    *   使用 `doReturn().when()`, `doThrow().when()`, `doAnswer().when()` 来处理 void 方法或需要替代 `when()` 语法的情况。

3.  **验证交互 (Verification)：**
    *   使用 `Mockito.verify(mock)` 来检查被测代码是否以预期的参数、预期的次数调用了 Mock 对象的特定方法。
    *   例如：`verify(mockedList).add("once");` (验证 `mockedList.add("once")` 被调用了一次)
    *   可以验证调用次数：`verify(mockedList, times(2)).add("twice");` (验证调用了两次)
    *   其他验证模式：`never()`, `atLeastOnce()`, `atLeast(N)`, `atMost(N)`, `only()` 等。

4.  **参数匹配器 (Argument Matchers)：**
    *   Mockito 提供了一系列灵活的匹配器（如 `any()`, `eq()`, `contains()`, `isNull()`, `isNotNull()`, `argThat()` 等）来匹配方法调用的参数，使得 Stubbing 和 Verification 更灵活，不必拘泥于具体的参数值。
    *   例如：`when(mockedList.get(anyInt())).thenReturn("element");` (对任何整数索引的 `get` 调用都返回 `"element"`)
    *   例如：`verify(mockedList).add(argThat(s -> s.length() > 5));` (验证添加了一个长度大于 5 的字符串)

5.  **Spying 部分真实对象：**
    *   使用 `Mockito.spy(realObject)` 可以创建一个对象的“间谍”(Spy)。默认情况下，Spy 会调用真实对象的方法（行为与真实对象一致）。
    *   你可以选择性地对 Spy 对象的特定方法进行 Stubbing（覆盖其真实行为），而未被 Stub 的方法仍保持原有逻辑。
    *   这在需要模拟对象的部分方法，同时保留其他方法真实行为时非常有用。**使用 Spy 需谨慎，因为它会调用真实方法，可能带来副作用。**

**基本使用示例**

```java
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

// 被测类 (通常会是另一个类)
public class SimpleTest {

    @Test
    public void testMockingAndVerification() {
        // 1. 创建 Mock 对象
        List<String> mockedList = mock(List.class);

        // 2. 使用 Mock 对象 (这是你被测代码会做的事情)
        mockedList.add("one");
        mockedList.add("two");
        mockedList.clear();

        // 3. 验证交互
        verify(mockedList).add("one"); // 验证 add("one") 被调用一次
        verify(mockedList).add("two"); // 验证 add("two") 被调用一次
        verify(mockedList).clear();    // 验证 clear() 被调用一次
        verify(mockedList, never()).add("three"); // 验证 add("three") 从未被调用
    }

    @Test
    public void testStubbing() {
        // 1. 创建 Mock 对象
        List<String> mockedList = mock(List.class);

        // 2. 设定 Mock 行为 (Stubbing)
        when(mockedList.get(0)).thenReturn("first"); // 当 get(0) 被调用时返回 "first"
        when(mockedList.get(1)).thenThrow(new RuntimeException("Index out of bounds!")); // 当 get(1) 被调用时抛出异常
        when(mockedList.get(anyInt())).thenReturn("element"); // 当 get(任何整数) 被调用时返回 "element"

        // 3. 使用 Mock 对象并断言结果 (这是你的测试逻辑)
        assertEquals("first", mockedList.get(0)); // 使用 get(0) 会返回 "first"
        assertThrows(RuntimeException.class, () -> mockedList.get(1)); // 使用 get(1) 会抛异常
        assertEquals("element", mockedList.get(999)); // 使用 get(999) 会返回 "element"

        // 4. 验证交互
        verify(mockedList, times(3)).get(anyInt()); // 验证 get 方法总共被调用了 3 次
    }
}
```

**Mockito 的主要优势**

1.  **简洁易读的 API：** Mockito 的 API 设计非常流畅（fluent interface），使得测试代码读起来像自然语言 (`when(...).thenReturn(...)`, `verify(...).someMethod(...)`)，大大提高了测试代码的可读性和可维护性。
2.  **强大的功能：** 提供了创建 Mock、设定行为（包括返回值、异常）、验证交互（包括调用次数、参数匹配）、Spying 等核心功能，满足绝大部分模拟需求。
3.  **提高测试隔离性：** 有效隔离被测代码与外部依赖，使测试专注于被测代码自身的逻辑。
4.  **提升测试速度：** 避免了与真实外部资源（如数据库、网络）的交互，测试执行速度显著加快。
5.  **促进 TDD：** 是实践测试驱动开发（Test-Driven Development）的利器，可以在依赖尚未实现时就编写测试。
6.  **与主流测试框架无缝集成：** 与 JUnit 4、JUnit 5 (Jupiter)、TestNG 等主流 Java 测试框架结合使用非常方便，通常通过注解（如 `@Mock`, `@InjectMocks`, `@Spy`, `@ExtendWith(MockitoExtension.class)`）简化 Mock 的创建和注入。
7.  **活跃的社区：** 拥有庞大且活跃的用户和开发者社区，文档丰富，遇到问题容易找到解决方案。

**总结：**

Mockito 是 Java 单元测试领域不可或缺的工具。它通过优雅地创建和管理 Mock 对象，让你能够隔离被测代码、模拟复杂的依赖行为、验证代码交互逻辑，从而编写出高效、可靠、易于维护的单元测试。掌握 Mockito 是提升 Java 开发人员测试技能和代码质量的关键一步。如果你正在写 Java 单元测试，尤其是在涉及外部依赖时，Mockito 绝对是你的首选利器。