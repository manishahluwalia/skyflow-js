import isTokenValid from "../../src/utils/jwtUtils";
jest.mock('jwt-decode', () => () => ({exp: 123}))

describe('Validation token', () => {

    test('empty token', () => {
        const res = isTokenValid("")
        expect(res).toBe(false)
    })

    test('invalid token type', () => {
        const res = isTokenValid({})
        expect(res).toBe(false)
    })

    test('invalid token', () => {
        const res = isTokenValid("token")
        expect(res).toBe(false)
    })
});